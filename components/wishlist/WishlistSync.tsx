"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { dbWishlistFetch, dbWishlistMerge } from "@/lib/wishlist/actions";
import { mergeWishlists } from "@/lib/wishlist/merge";
import { useWishlistStore, whenWishlistHydrated } from "@/store/wishlist";

/**
 * Keeps the localStorage wishlist and the account's `wishlists` rows in step
 * for signed-in users (M1). Renders nothing; mounted once in the locale
 * layout, so it survives client-side navigations.
 *
 * - Signed in (initial session or SIGNED_IN): upload this device's items,
 *   pull the account's items, and replace the store with the union. Runs
 *   once per user per tab session (sessionStorage marker), so full page
 *   loads don't each pay two server-action round trips.
 * - SIGNED_OUT: clear the local wishlist so the next person on this device
 *   doesn't see it.
 * - Guests: nothing; their wishlist stays local-only.
 */

const SYNCED_KEY = "mm-wishlist-synced";

// Module-level so it is shared with resetWishlistForSignOut() below.
let syncedUserId: string | null = null;
let inFlight: string | null = null;

function readMarker(): string | null {
  try {
    return sessionStorage.getItem(SYNCED_KEY);
  } catch {
    return null;
  }
}

function writeMarker(userId: string | null) {
  try {
    if (userId) sessionStorage.setItem(SYNCED_KEY, userId);
    else sessionStorage.removeItem(SYNCED_KEY);
  } catch {
    // Private mode / blocked storage: we just sync again next load.
  }
}

/**
 * Clears the local wishlist and forgets the sync marker. The account
 * sign-out is a server action, which clears the auth cookie without the
 * browser Supabase client ever emitting SIGNED_OUT, so the component that
 * submits it calls this directly.
 */
export function resetWishlistForSignOut() {
  syncedUserId = null;
  inFlight = null;
  writeMarker(null);
  useWishlistStore.getState().clear();
}

async function syncFor(userId: string) {
  if (syncedUserId === userId || inFlight === userId) return;
  if (readMarker() === userId) {
    syncedUserId = userId;
    return;
  }
  inFlight = userId;
  try {
    // The persisted guest list must be loaded before we read or replace it.
    await whenWishlistHydrated();
    const snapshot = useWishlistStore.getState().items;

    if (snapshot.length > 0) {
      const ok = await dbWishlistMerge(snapshot.map((i) => i.productId));
      if (!ok) return; // retry on the next auth event / page load
    }
    const remote = await dbWishlistFetch();
    if (remote === null || inFlight !== userId) return;

    // Merge against the store as it is NOW: the shopper may have toggled
    // hearts while we were waiting. Anything removed meanwhile stays removed.
    const current = useWishlistStore.getState().items;
    const currentIds = new Set(current.map((i) => i.productId));
    const removedMeanwhile = new Set(
      snapshot.map((i) => i.productId).filter((id) => !currentIds.has(id)),
    );
    useWishlistStore
      .getState()
      .replaceAll(
        mergeWishlists(
          current,
          remote.filter((r) => !removedMeanwhile.has(r.productId)),
        ),
      );

    syncedUserId = userId;
    writeMarker(userId);
  } catch {
    // Network / action failure: leave local state alone, retry later.
  } finally {
    if (inFlight === userId) inFlight = null;
  }
}

export function WishlistSync() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Initial check on mount. INITIAL_SESSION below normally covers this
    // too; syncFor() dedupes, so whichever arrives first does the work.
    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id;
      if (id) void syncFor(id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetWishlistForSignOut();
        return;
      }
      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        session?.user.id
      ) {
        const id = session.user.id;
        // Don't call server actions from inside the auth callback: it holds
        // the client's auth lock, and the action's own work is independent.
        setTimeout(() => void syncFor(id), 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
