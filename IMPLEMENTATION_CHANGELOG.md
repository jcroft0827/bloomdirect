# GetBloomDirect / BloomWebsites Implementation Changelog

This file tracks completed implementation work from the October 13, 2026 development cycle forward. Planned work is kept separate from completed work so Git commits and releases describe only what actually changed.

## Unreleased

### 2026-10-13 — Production Hardening Sprint 1

#### Security
- Protected the legacy `/api/s3/upload-url` endpoint behind authenticated shop access.
- Restricted legacy S3 uploads to supported raster image MIME types and moved new uploads into shop-scoped object keys (`shops/{shopId}/uploads/...`) instead of bucket-root filenames.
- Added persistent rate limiting to authenticated S3 upload and signed-view requests.
- Protected `/api/s3/view-url` behind authentication and restricted non-admin shops to their own shop-scoped object keys.
- Changed `Shop.password` to `select: false` so password hashes are excluded from normal Mongoose queries and cannot accidentally be serialized by `/api/shops/me` or other broad shop responses. Authentication/password-change flows already opt in with `+password` where required.
- Added durable Mongo-backed login throttling using account + client-IP scoped limits.
- Added durable password-reset request throttling while preserving the generic anti-enumeration response.
- Added durable email-verification send and confirmation throttling.
- Added durable florist-invitation and invitation-resend throttling.
- Replaced the in-memory POS API rate limiter with the existing Mongo-backed persistent limiter so limits continue to work across Vercel instances/restarts.
- Added reusable outbound-host validation that rejects loopback, private, link-local, reserved, documentation, multicast, and other non-public network targets in production.
- Applied outbound-host validation when webhook destinations are created/updated and again before normal webhook delivery/retry attempts.
- Applied outbound-host validation when The Floral POS transport settings are saved and again before FTP/FTPS/SFTP connection/send attempts.
- Added baseline response security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, plus production HSTS.

#### Email / tenant isolation
- Added optional `shopId` ownership to `EmailEvent` records.
- Scoped the Email History API to the authenticated shop instead of returning the global email-event collection.
- Protected individual Email History records so shops cannot request another shop's event by ID.
- Protected the Email History page itself with server-side authentication redirect.
- Protected florist invitation email sending behind authentication and active-account checks.
- Stopped trusting a client-supplied florist/business identity for invitations when the authenticated shop already has a canonical business name.
- Restricted invitation links to GetBloomDirect/configured application hosts.
- Unified new invitation audit events on `invite_florist` while retaining legacy resend compatibility with `invite-florist`.
- Moved Email History invite resend to the authenticated server-side resend endpoint instead of downloading the event payload and re-sending from the browser.
- Associated new outside-network order emails, BloomWebsite transactional emails, password-reset emails, and florist invitation emails with their owning shop where applicable.
- Hid resend controls for Email History entries that are not supported invite events.

#### Infrastructure / reliability
- Updated webhook retry authorization to accept Vercel's conventional `CRON_SECRET` as well as the existing `INTERNAL_CRON_SECRET` fallback.
- Renamed local `module` variables in POS SFTP transport code to avoid Next.js' reserved-module lint rule while touching the transport security path.

#### Customer-facing correctness
- Corrected checkout tax helper text so Bloom no longer claims native tax is automatically calculated from delivery destination/pickup location. The UI now accurately describes florist-configured tax settings.

#### Database / model changes
- `Shop.password`: now excluded from queries by default (`select: false`).
- `EmailEvent.shopId`: new optional indexed `ObjectId` reference to `Shop`; no destructive migration is required. Legacy unowned email events remain in the database but are intentionally not exposed in shop-scoped Email History.

#### Testing / verification performed in this batch
- Repository-wide reference review for every touched endpoint and model.
- Checked all four external POS API call sites after converting the limiter to async persistent storage.
- Checked all known legacy S3 upload callers for compatibility with shop-scoped keys.
- Checked password-reading call sites to confirm authentication/change/reset flows explicitly select `+password`.
- Checked EmailEvent creation sites and added ownership where the originating shop is known.
- Static/syntax/build verification still required on Joe's Node 24 environment before deployment.

#### Intentionally not completed yet
- Remove or narrow the global `Access-Control-Allow-Origin: *` API policy only after auditing any browser-based external consumers.
- Add a Content Security Policy after inventorying Stripe, Google, CloudFront, inline styles/scripts, and storefront custom-domain requirements.
- Increase commerce-recovery/webhook-retry cron cadence after confirming the Vercel plan/cron limits for the production account.
- Add automated regression tests for auth/tenant boundaries/checkout/payment behavior.
- Review whether plain FTP should remain supported for POS transport or whether production should require SFTP/FTPS.
- Add session-version based “sign out all other devices” support.
