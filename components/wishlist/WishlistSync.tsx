"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { dbWishlistFetch, dbWishlistMerge } from "@/lib/wishlist/actions";
import {
  isSyncFresh,
  reconcileWishlist,
  wishlistSyncMode,
  type WishlistSyncStamp,
} from "@/lib/wishlist/merge";
import { useWishlistStore, whenWishlistHydrated } from "@/store/wishlist";

/**
 * Keeps the localStorage wishlist and the account's `wishlists` rows in step
 * for signed-in users (M1). Renders nothing; mounted once in the locale
 * layout, so it survives client-side navigations.
 *
 * - Signed in: what happens depends on who owns the device's list (the
 *   store's ownerId, see wishlistSyncMode). A guest list is uploaded and
 *   unioned with the account; this account's own list is just refreshed
 *   from the DB (signed-in toggles already wrote through), so removals made
 *   on another device stick; another account's leftover list is dropped.
 *   Re-runs on a reload or when the tab comes back into view, at most once
 *   per WISHLIST_REFRESH_MS (sessionStorage stamp).
 * - SIGNED_OUT, or no session while the list still belongs to an account
 *   (expired cookie, admin sign-out): clear the local wishlist so the next
 *   person on this device doesn't see it.
 * - Guests: nothing; their wishlist stays local-only.
 */

const SYNCED_KEY = "mm-wishlist-synced";

// Module-level so it is shared with resetWishlistForSignOut() below.
let lastSync: WishlistSyncStamp | null = null;
let inFlight: string | null = null;

function readStamp(): WishlistSyncStamp | null {
  try {
    const raw = sessionStorage.getItem(SYNCED_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as WishlistSyncStamp).userId === "string" &&
      typeof (parsed as WishlistSyncStamp).at === "number"
    ) {
      return parsed as WishlistSyncStamp;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStamp(stamp: WishlistSyncStamp | null) {
  lastSync = stamp;
  try {
    if (stamp) sessionStorage.setItem(SYNCED_KEY, JSON.stringify(stamp));
    else sessionStorage.removeItem(SYNCED_KEY);
  } catch {
    // Private mode / blocked storage: we just sync again next load.
  }
}

/**
 * Clears the local wishlist (and its owner) and forgets the sync stamp. The
 * account sign-out is a server action, which clears the auth cookie without
 * the browser Supabase client ever emitting SIGNED_OUT, so the component
 * that submits it calls this directly.
 */
export function resetWishlistForSignOut() {
  inFlight = null;
  writeStamp(null);
  useWishlistStore.getState().clear();
}

/** No session: drop a list some account left behind on this device. */
async function forgetStaleOwner() {
  await whenWishlistHydrated();
  if (inFlight) return;
  if (useWishlistStore.getState().ownerId) resetWishlistForSignOut();
}

async function syncFor(userId: string) {
  if (inFlight === userId) return;
  if (isSyncFresh(lastSync ?? readStamp(), userId, Date.now())) return;
  inFlight = userId;
  try {
    // The persisted list and its owner must be loaded before we use them.
    await whenWishlistHydrated();
    const mode = wishlistSyncMode(useWishlistStore.getState().ownerId, userId);
    const snapshot = useWishlistStore.getState().items;

    if (mode === "merge-guest" && snapshot.length > 0) {
      const ok = await dbWishlistMerge(
        snapshot.map((i) => i.productId),
        userId,
      );
      if (!ok || inFlight !== userId) return; // retry on the next trigger
    }
    const remote = await dbWishlistFetch(userId);
    if (remote === null || inFlight !== userId) return;

    const store = useWishlistStore.getState();
    const next = reconcileWishlist(mode, snapshot, store.items, remote);
    // Skip a no-op replace: a new array would make WishlistGrid refetch.
    const same =
      next.length === store.items.length &&
      next.every((it, i) => it.productId === store.items[i].productId);
    if (!same) store.replaceAll(next);
    store.setOwner(userId);
    writeStamp({ userId, at: Date.now() });
  } catch {
    // Network / action failure: leave local state alone, retry later.
  } finally {
    if (inFlight === userId) inFlight = null;
  }
}

export function WishlistSync() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const onSession = (userId: string | undefined) => {
      if (userId) void syncFor(userId);
      else void forgetStaleOwner();
    };

    // Initial check on mount. INITIAL_SESSION below normally covers this
    // too; syncFor() dedupes, so whichever arrives first does the work.
    void supabase.auth.getSession().then(({ data }) => {
      onSession(data.session?.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetWishlistForSignOut();
        return;
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        const id = session?.user.id;
        // Don't call server actions from inside the auth callback: it holds
        // the client's auth lock, and the action's own work is independent.
        setTimeout(() => onSession(id), 0);
      }
    });

    // Mobile tabs live for days: pick up changes from other devices when
    // the shopper comes back to the tab (rate-limited inside syncFor).
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data }) => {
        // Same as mount: no session (e.g. signed out in another tab via the
        // server action, which emits no SIGNED_OUT here) drops a list an
        // account left behind.
        onSession(data.session?.user.id);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
