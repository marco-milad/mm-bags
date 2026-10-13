import { create } from "zustand";

/**
 * Whether someone is signed in, as last seen by WishlistSync (which already
 * watches the Supabase session). `null` = not known yet — callers must treat
 * that as "don't know", never as "guest", so a signed-in shopper is never
 * told to sign in during the first moment of a page load.
 */
export const useAuthPresence = create<{
  signedIn: boolean | null;
  setSignedIn: (v: boolean) => void;
}>((set) => ({
  signedIn: null,
  setSignedIn: (v) => set({ signedIn: v }),
}));
