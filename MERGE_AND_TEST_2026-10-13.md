# Production Hardening 01 — Merge & Test

## Merge
Copy the contents of this ZIP directly into the GetBloomDirect project root. The ZIP opens directly to `src/`, `next.config.ts`, and the changelog; there is no wrapper folder.

## Build gate
Run:

```powershell
npm run build
```

Do not deploy if the build fails. Send the first error back for correction.

## Focused smoke tests after a passing build
1. Log in normally with a valid account.
2. Settings → upload/change the shop logo; verify the new image displays after save/refresh.
3. Offerings → upload an offering image; verify it displays.
4. New Order → exercise the existing product/photo upload path if convenient.
5. Send a florist invitation from the dashboard; verify delivery and that Email History shows only the current shop's events.
6. From Email History, resend a florist invitation and confirm it succeeds.
7. Request a password-reset email once and verify it arrives.
8. Email verification: send a code and confirm a correct code still verifies normally.
9. TFPOS integration: run the existing connection test against the known public `orders.getbloomdirect.com` endpoint.
10. POS webhook settings: existing public HTTPS webhook should save; `https://127.0.0.1/...` or a private address should be rejected.
11. BloomWebsite checkout: verify the tax helper text now describes florist-configured tax settings rather than destination-based tax.
12. If convenient, call one external POS API endpoint using a valid API key to confirm the async persistent rate limiter did not alter the successful response path.

## Important compatibility note
New legacy-S3 uploads now use object keys under `shops/{shopId}/uploads/...`. Existing stored image URLs/keys are not moved or deleted. The legacy signed-view route is not referenced by the current repository; if an unknown external consumer depends on arbitrary old root-level keys, that consumer will now be denied unless it is an admin.

## Database note
`EmailEvent.shopId` is optional, so no destructive migration is required. Existing unowned EmailEvent rows remain untouched but intentionally disappear from shop-scoped Email History instead of being globally exposed.
