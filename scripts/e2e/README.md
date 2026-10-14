# Browser end-to-end suite

Real browser runs (headless Chrome) of the scenarios a store has to get right.
Unit tests (`npm test`) check the logic; this suite checks the whole flow.

## Run it
```
npm run build && npm run start      # in one terminal
npm run e2e                         # in another: all suites, against http://localhost:3000
npm run e2e -- --only=orders        # one suite: storefront | orders | auth
```
It exits with code 1 if anything fails and prints a summary at the end. Run it
before any big release. It takes about 10 minutes.

## What it covers
- **storefront**: empty search state (AR/EN), bottom-nav active tab, wishlist toast,
  cart quantity capped at stock, 44px cart buttons, checkout form errors announced,
  no horizontal overflow at 390px/1366px, and a real 404 for missing products.
- **orders**: guest COD order through the UI; owner vs stranger on the confirmation
  page (stranger never sees phone/surname); tracking page; brute-forcing the
  tracking code is blocked; admin cancel puts stock back exactly once; delivered
  orders can't be cancelled; a sold-out cart line blocks checkout; and two shoppers
  racing for the last unit (exactly one gets it, stock never goes negative).
- **auth**: login, wrong password, sign out, `?next=` redirect, the set-new-password
  page, the Google button follows the Supabase setting, open-redirect guard, and a
  guest order joining the account with the same confirmed email.

## Data safety
- Every suite creates its own throwaway data (`zz-qa-*` products, QA orders, a QA
  account with a `+label` email) and deletes it in `finally`, even on failure. A
  crashed run's leftovers are swept by the next run.
- The data lives in the Supabase project from `.env.local`, which is the
  **production database**. The QA products are visible in the store for the
  few minutes a run takes.
- Running against the live site needs an explicit flag:
  `npm run e2e -- https://mm-bags.vercel.app --allow-prod`.
- Rate limits: per-IP limits skip loopback (localhost) requests, and QA phone
  numbers are random per run, so repeated local runs aren't blocked.

## Requirements
Chrome or Edge installed (or `CHROME_PATH`), `.env.local` with the Supabase keys
and `ADMIN_EMAIL`. Optional: `QA_EMAIL_BASE` (default `qa@example.com`) for the
QA account's address.
