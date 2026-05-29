"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SizeGuideUxState = {
  completed: boolean;
  markCompleted: () => void;
  reset: () => void;
};

// sessionStorage so "for that session" means "for this tab" — wiped on tab close.
export const useSizeGuideUxStore = create<SizeGuideUxState>()(
  persist(
    (set) => ({
      completed: false,
      markCompleted: () => set({ completed: true }),
      reset: () => set({ completed: false }),
    }),
    {
      name: "mm-size-guide-ux",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? (undefined as unknown as Storage)
          : window.sessionStorage,
      ),
    },
  ),
);

export function useSizeGuideUxHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useSizeGuideUxStore.persist.onFinishHydration(() => setHydrated(true));
    if (useSizeGuideUxStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
