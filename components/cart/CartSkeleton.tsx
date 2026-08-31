/**
 * Pre-hydration placeholders for the cart and checkout.
 *
 * The cart lives in localStorage, so the server cannot know whether it is
 * empty, has one line or has five. Both pages therefore render a placeholder
 * until the store rehydrates — and the placeholder used to be a single line of
 * text, roughly a fifth of the height of what replaced it.
 *
 * On a 1440x900 desktop that short placeholder left the footer inside the
 * viewport, so when the real content arrived the footer moved down and the
 * whole growth counted as layout shift: 0.067 on the cart with one line, 0.22
 * with three, and 0.10-0.14 on checkout. Mobile measured 0.000 throughout only
 * because the content already exceeded the viewport there, putting the footer
 * below the fold where shifts are not counted.
 *
 * These placeholders mirror the real markup instead — same grid, same card
 * radii, padding and row heights — so the space is reserved by the layout that
 * is coming rather than by an invented number. The heights below are the ones
 * the real components produce, not round figures picked to make a metric move.
 */

function Block({ className = "" }: { className?: string }) {
  // motion-safe so the reduced-motion preference already honoured site-wide
  // silences this too.
  return (
    <div
      className={`motion-safe:animate-pulse rounded bg-[var(--color-border)]/60 ${className}`}
    />
  );
}

/** One cart line: 64px thumbnail, two text rows, a stepper and a price. */
function CartRowSkeleton() {
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-4">
        <Block className="h-16 w-16 shrink-0" />
        <div className="flex-1 space-y-2">
          <Block className="h-4 w-2/5" />
          <Block className="h-3 w-1/4" />
        </div>
        <Block className="h-9 w-24 shrink-0 rounded-full" />
        <Block className="h-4 w-20 shrink-0" />
      </div>
    </li>
  );
}

/**
 * Cart placeholder. Mirrors the `grid gap-6 lg:grid-cols-[2fr_1fr]` of the
 * loaded cart: one line on the left, the summary card on the right.
 *
 * One row rather than several: the empty state and the single-line state are
 * the two most common landings and both sit at ~460px, so reserving one row
 * lands on them exactly. A fuller cart still grows, but by then the content is
 * past the fold and the footer no longer moves.
 */
export function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]" aria-hidden="true">
      <ul className="space-y-3">
        <CartRowSkeleton />
      </ul>
      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <Block className="h-6 w-32" />
        <div className="mt-5 space-y-3">
          <Block className="h-4 w-full" />
          <Block className="h-4 w-3/4" />
          <Block className="h-px w-full" />
          <Block className="h-5 w-2/3" />
        </div>
        <Block className="mt-5 h-12 w-full rounded-full" />
        <Block className="mx-auto mt-3 h-3 w-24" />
      </aside>
    </div>
  );
}

/**
 * Pre-paint cart probe.
 *
 * Checkout has two post-hydration heights that are nothing alike: the empty
 * state is short, the shipping form is roughly three times taller. Reserving
 * one height fixes that case and breaks the other — reserving the form's height
 * made the empty case shift *upward* and measured worse than doing nothing.
 *
 * So the page stops guessing and finds out. This runs from the parser, before
 * first paint, reads the persisted cart and marks the document, and CSS shows
 * whichever placeholder matches. Same technique the urgency banner already uses
 * to read its dismissed flag before paint.
 *
 * Wrapped in try/catch and defaulting to the fuller placeholder: a browser that
 * blocks storage lands on the state that has items, which is the one worth
 * optimising for.
 */
export const CART_STATE_PROBE = `(function(){try{var r=localStorage.getItem("mm-cart");var n=0;if(r){var p=JSON.parse(r);n=(p&&p.state&&p.state.items&&p.state.items.length)||0;}document.documentElement.setAttribute("data-cart",n===0?"empty":"filled");}catch(e){document.documentElement.setAttribute("data-cart","filled");}})();`;

/**
 * Checkout placeholder. Mirrors `grid gap-8 lg:grid-cols-[1fr_360px]`: the step
 * indicator and the shipping-form card on the left, the order summary rail on
 * the right.
 *
 * The eight field rows are the eight inputs step 1 actually renders (name,
 * phone, email, governorate, city, street, building, notes), so the reserved
 * height comes from the form itself.
 *
 * Both variants are rendered and CSS picks one using the data-cart attribute
 * the probe above sets before paint, so the correct height is reserved from the
 * very first frame.
 */
export function CheckoutSkeleton() {
  return (
    <>
      {/* Shown only when the probe found an empty cart. */}
      <div
        className="mx-auto hidden max-w-md flex-col items-center gap-4 py-16 text-center [html[data-cart=empty]_&]:flex"
        aria-hidden="true"
      >
        <Block className="h-16 w-16 rounded-full" />
        <Block className="h-7 w-40" />
        <Block className="h-4 w-64" />
        <Block className="mt-2 h-10 w-36 rounded-full" />
      </div>

      <div
        className="grid gap-8 lg:grid-cols-[1fr_360px] [html[data-cart=empty]_&]:hidden"
        aria-hidden="true"
      >
      <div>
        <div className="mb-6 flex items-center justify-center gap-3">
          <Block className="h-10 w-10 rounded-full" />
          <Block className="h-px w-16" />
          <Block className="h-10 w-10 rounded-full" />
          <Block className="h-px w-16" />
          <Block className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 md:p-7">
          <div className="space-y-2">
            <Block className="h-6 w-40" />
            <Block className="h-4 w-64" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Block className="h-3 w-28" />
                <Block className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Block className="h-12 w-full rounded-full" />
        </div>
      </div>
      <aside>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <Block className="h-6 w-32" />
          <div className="mt-5 space-y-3">
            <Block className="h-4 w-full" />
            <Block className="h-4 w-3/4" />
            <Block className="h-px w-full" />
            <Block className="h-5 w-2/3" />
          </div>
        </div>
      </aside>
      </div>
    </>
  );
}
