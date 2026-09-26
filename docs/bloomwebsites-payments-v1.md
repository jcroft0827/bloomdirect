# BloomWebsites Payments V1

V1 supports exactly two processors:

- Stripe
- Fiserv

Bloom owns the checkout, canonical order, tax, inventory, and normalized payment state.
Processor-specific payloads stay behind provider adapters.

## Non-negotiables

- Never trust browser totals.
- Never store PAN/CVV/raw card data in MongoDB.
- Never charge before authoritative cart/fulfillment/tax validation.
- Reserve tracked inventory immediately before payment.
- Release reservation when payment cannot start.
- Bind the processor amount to the server-calculated final total.
- Use one processor idempotency key per Bloom checkout attempt.
- Do not create the canonical order until payment is confirmed successful.
- Recover payment-success/order-commit gaps from the durable checkout attempt.

## Stripe

Bloom uses connected-account direct charges with no Bloom application fee in V1.
The merchant connection stores the connected account identifier only.

## Fiserv

Bloom's Fiserv provider boundary is present in V1. Production activation must use
Fiserv-hosted/tokenized payment collection or another approved PCI-safe mechanism.
Do not post raw card data through Bloom's own API routes.

Authorize.Net is intentionally deferred.

## Paid-order finalization

Payment confirmation is server-authoritative:

1. Browser/processor completes payment.
2. Bloom re-reads the payment from Stripe/Fiserv.
3. Bloom verifies processor status and amount.
4. Bloom marks the durable checkout attempt payment_succeeded.
5. Bloom creates the canonical BloomWebsiteOrder exactly once.
6. Bloom commits the native tax transaction.
7. Bloom commits the inventory reservation.
8. Bloom marks the checkout attempt order_committed.

The checkout attempt stores a server-generated recovery snapshot before processor
handoff. Stripe webhooks and the reconciliation service can therefore recover a
successful charge even if the browser disappears or the application crashes
between payment and order creation.

Fiserv uses the same finalization service once its production gateway handshake
and webhook contract are activated.

## Order operations

After a successful processor-verified payment, BloomWebsites now:

- creates the canonical order exactly once;
- emails the customer an order confirmation;
- emails the florist a new-order alert;
- exposes the order in the BloomWebsites order dashboard;
- supports fulfillment status transitions and customer status emails;
- supports Stripe refunds through the original connected account;
- requires a paid order to be fully refunded before cancellation;
- keeps Fiserv refund/notification orchestration behind the same provider-neutral
  interfaces until production Fiserv credentials and gateway contracts are active.

Customer confirmation pages resolve from the durable checkout attempt identifier,
not from a guessable order number alone.

## Storefront Stripe checkout

The BloomWebsite payment screen now performs the complete browser flow:

1. Revalidate fulfillment.
2. Run authoritative checkout preflight with a durable idempotency key.
3. Prepare payment server-side, reserve inventory, and calculate native tax.
4. Load Stripe.js directly from `https://js.stripe.com/v3/`.
5. Initialize Stripe using the florist's connected-account ID.
6. Render Stripe Payment Element with the server-created PaymentIntent client secret.
7. Confirm payment in Stripe.
8. Call Bloom's payment-confirm endpoint.
9. Bloom re-reads the processor payment, verifies amount/status, creates the
   canonical order, commits tax/inventory, and sends notifications.
10. Clear cart/checkout state only after `order_committed`.
11. Redirect to the customer order-confirmation page.

Required browser-safe environment variable:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

The Stripe secret key and webhook secret remain server-only.

The active checkout attempt is kept in sessionStorage so the browser can resume
the same processor PaymentIntent after a refresh instead of creating a second
charge attempt. Redirect-based payment methods return to the payment screen,
where Bloom performs the same server-authoritative finalization.

The duplicate-cart-line tax reference issue was also removed by including stable
cart-row indexes in authoritative tax line reference IDs.


## Automated commerce recovery

BloomWebsites has a secured recovery endpoint:

`GET /api/internal/bloomwebsites/commerce-recovery`

The endpoint requires:

`Authorization: Bearer <CRON_SECRET>`

`INTERNAL_CRON_SECRET` is accepted as a backward-compatible local/manual
fallback, but Vercel Cron automatically uses `CRON_SECRET`.

Each recovery run:

1. reconciles checkout attempts that already have processor payment references;
2. finalizes paid orders exactly once;
3. reconciles failed/canceled processor payments;
4. examines expired inventory reservations;
5. cancels still-confirmable expired Stripe PaymentIntents before returning
   their inventory;
6. extends reservations whose processor payment is genuinely still processing;
7. releases safe abandoned reservations and closes stale checkout attempts.

Payment reconciliation always runs before inventory expiry cleanup so Bloom
never intentionally returns inventory for a payment that Stripe has already
confirmed successful.

The repository includes a once-daily Vercel Cron entry as a plan-compatible
backstop. For a production Vercel Pro deployment, change the schedule to
`*/5 * * * *` so recovery runs every five minutes.

Storefront preflight also performs a small, website-scoped opportunistic
recovery pass so active shops can reclaim stale inventory without waiting for
the daily backstop.
