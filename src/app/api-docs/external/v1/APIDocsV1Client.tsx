// app/api-docs/external/v1/APIDocsV1Client.tsx

import Endpoint from "@/components/api-docs/Endpoint";
import Section from "@/components/api-docs/Section";

import {
  getOrdersRequest,
  getOrdersResponse,
  acceptOrderRequest,
  acceptOrderResponse,
  declineOrderRequest,
  declineOrderResponse,
  completeOrderRequest,
  completeOrderResponse,
} from "./examples/orders";

export default function APIDocsV1Client() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Section title="POS Integration Guide (IMPORTANT)">
        <div className="text-sm text-gray-700 space-y-3">
          <p>
            This API is designed for fulfilling shop POS systems to receive and
            manage incoming GetBloomDirect orders.
          </p>

          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="font-semibold mb-2">Supported v1 Workflow</p>
            <div className="overflow-x-auto rounded-lg bg-white p-3">
              <pre className="text-xs leading-6 text-slate-800">
                {`PENDING_ACCEPTANCE
              ├─ Accept  → ACCEPTED → Delivered → COMPLETED
              └─ Decline → DECLINED`}
              </pre>
            </div>
          </div>

          <div>
            <p className="font-semibold">
              What v1 POS integrations should support:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Retrieve incoming orders assigned to the fulfilling shop</li>
              <li>Accept or decline pending orders</li>
              <li>Require a decline reason when declining an order</li>
              <li>Mark eligible orders as completed after fulfillment</li>
            </ul>
          </div>

          <div className="text-sm bg-yellow-50 p-4 rounded-xl mt-4">
            <p className="font-semibold mb-2">Not included in v1</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Creating outbound orders from the POS</li>
              <li>Marking orders paid from the POS</li>
              <li>Settlement calculations inside the POS</li>
            </ul>
          </div>

          <div className="text-sm bg-gray-50 p-4 rounded-xl mt-4">
            <p className="font-semibold mb-2">Money Format</p>
            <p>
              GetBloomDirect stores monetary values internally in cents, but the
              POS API returns dollar amounts as JSON numbers in USD.
            </p>
            <p className="mt-2 text-gray-600">
              Example: <code>50</code> means $50.00, and <code>59.99</code>{" "}
              means $59.99.
            </p>
          </div>

          <div className="text-sm bg-red-50 p-4 rounded-xl mt-3">
            <p className="font-semibold mb-2">Decline Reasons</p>

            <ul className="list-disc ml-5 space-y-1">
              <li>OUT_OF_STOCK</li>
              <li>TOO_BUSY</li>
              <li>DELIVERY_TOO_FAR</li>
              <li>OTHER</li>
            </ul>

            <p className="mt-3">
              If <b>declineReason = &quot;OTHER&quot;</b>, then{" "}
              <b>declineMessage</b> is required.
            </p>

            <p className="mt-2 text-gray-600">Example:</p>

            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
              {`{
  "declineReason": "OTHER",
  "declineMessage": "We are closing early today"
}`}
            </pre>
          </div>

          <div className="text-sm bg-blue-50 p-4 rounded-xl mt-3">
            <h2 className="text-2xl font-semibold">Authentication</h2>

            <p className="text-sm text-neutral-700">
              All external v1 API requests must include your shop&apos;s API
              key.
            </p>

            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-950 p-4 font-mono text-sm text-white">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  API key header
                </p>

                <pre className="overflow-x-auto">
                  {`x-api-key: YOUR_API_KEY`}
                </pre>
              </div>

              <div className="rounded-xl bg-neutral-950 p-4 font-mono text-sm text-white">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Bearer authorization
                </p>

                <pre className="overflow-x-auto">
                  {`Authorization: Bearer YOUR_API_KEY`}
                </pre>
              </div>
            </div>

            <p className="text-sm text-neutral-700">
              Use one authentication method per request. The examples in this
              guide use the <code>x-api-key</code> header.
            </p>

            <p className="text-sm text-neutral-700">
              You can generate and manage your API key from your GetBloomDirect
              dashboard under POS API Access.
            </p>

            <p className="text-sm text-red-500">
              Only Pro shops can use the external POS API. If your subscription
              becomes inactive, API access will stop until Pro access is
              restored.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Orders API">
        <Endpoint
          method="GET"
          path="/api/external/v1/orders"
          description="Retrieve incoming orders assigned to your fulfilling shop. Use the optional since parameter to return orders updated after a specific timestamp, and limit to control the number of results."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={getOrdersRequest}
          exampleResponse={getOrdersResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "No API key was supplied.",
            },
            {
              code: "INVALID_API_KEY",
              message: "The API key is invalid or API access is disabled.",
            },
            {
              code: "PRO_REQUIRED",
              message: "An active Bloom Pro subscription is required.",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "The shop account is suspended.",
            },
            {
              code: "ACCOUNT_ARCHIVED",
              message: "The shop account is no longer active.",
            },
            {
              code: "ACCOUNT_RESTRICTED",
              message: "The shop account is restricted from API access.",
            },
            {
              code: "INVALID_REQUEST",
              message: "The since or limit query parameter is invalid.",
            },
            {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Too many requests were made.",
            },
            {
              code: "SERVER_ERROR",
              message: "The orders could not be retrieved.",
            },
          ]}
        />
        <div className="mb-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold">Optional query parameters</p>

          <ul className="mt-2 list-disc space-y-1 ml-5">
            <li>
              <code>since</code>: ISO 8601 timestamp. Returns orders updated
              after this time.
            </li>
            <li>
              <code>limit</code>: Positive whole number. Defaults to 100 and has
              a maximum of 250.
            </li>
          </ul>

          <pre className="mt-3 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
            {`GET /api/external/v1/orders?since=2026-07-15T12:00:00.000Z&limit=100`}
          </pre>
        </div>

        <div className="mb-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Order response fields
            </h3>

            <p className="mt-1">
              The Orders endpoint and each order-action endpoint return the same
              normalized order object.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Delivery window</p>

              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <code>anytime</code>: no specific delivery window was
                  requested. The <code>from</code> and <code>to</code> values
                  are empty strings.
                </li>
                <li>
                  <code>specific</code>: both values contain 24-hour{" "}
                  <code>HH:mm</code> times.
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Decline details</p>

              <p className="mt-2">
                For non-declined orders, <code>decline.reason</code> and{" "}
                <code>decline.message</code> are empty strings. For declined
                orders, they contain the saved decline details.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
              <p className="font-semibold text-slate-900">Monetary totals</p>

              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-xs text-purple-700">
                    productsSubtotal
                  </dt>
                  <dd>Total value of the order products.</dd>
                </div>

                <div>
                  <dt className="font-mono text-xs text-purple-700">
                    deliveryFee
                  </dt>
                  <dd>Delivery amount charged for the order.</dd>
                </div>

                <div>
                  <dt className="font-mono text-xs text-purple-700">
                    originatingFee
                  </dt>
                  <dd>Fee retained by the sending florist.</dd>
                </div>

                <div>
                  <dt className="font-mono text-xs text-purple-700">tax</dt>
                  <dd>Sales tax included in the customer total.</dd>
                </div>

                <div>
                  <dt className="font-mono text-xs text-purple-700">
                    orderTotal
                  </dt>
                  <dd>Total amount charged to the customer.</dd>
                </div>

                <div>
                  <dt className="font-mono text-xs text-purple-700">
                    fulfillmentAmount
                  </dt>
                  <dd>
                    Product subtotal plus delivery fee owed to the fulfilling
                    florist.
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-slate-500">
                All monetary values are returned as USD numbers, not integer
                cents.
              </p>
            </div>
          </div>
        </div>

        <Endpoint
          method="POST"
          path="/api/external/v1/orders/:id/accept"
          description="Accept an incoming order."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={acceptOrderRequest}
          exampleResponse={acceptOrderResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "No API key was supplied.",
            },
            {
              code: "INVALID_API_KEY",
              message: "The API key is invalid or API access is disabled.",
            },
            {
              code: "PRO_REQUIRED",
              message: "An active Bloom Pro subscription is required.",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "The shop account is suspended.",
            },
            {
              code: "ACCOUNT_ARCHIVED",
              message: "The shop account is no longer active.",
            },
            {
              code: "ACCOUNT_RESTRICTED",
              message: "The shop account is restricted from API access.",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "The order was not found.",
            },
            {
              code: "FORBIDDEN",
              message: "The order is assigned to a different fulfilling shop.",
            },
            {
              code: "SHOP_NOT_READY_TO_ACCEPT",
              message: "The shop is not currently eligible to accept orders.",
            },
            {
              code: "INVALID_TRANSITION",
              message: "The order cannot be accepted from its current status.",
            },
            {
              code: "SERVER_ERROR",
              message: "The order could not be accepted.",
            },
          ]}
        />

        <Endpoint
          method="POST"
          path="/api/external/v1/orders/:id/decline"
          description="Decline an incoming order. Requires declineReason. declineMessage is required only when declineReason is OTHER."
          headers={{
            "x-api-key": "YOUR_API_KEY",
            "Content-Type": "application/json",
          }}
          requestBody={`{
  "declineReason": "OTHER",
  "declineMessage": "We are closing early today"
}`}
          exampleRequest={declineOrderRequest}
          exampleResponse={declineOrderResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "No API key was supplied.",
            },
            {
              code: "INVALID_API_KEY",
              message: "The API key is invalid or API access is disabled.",
            },
            {
              code: "PRO_REQUIRED",
              message: "An active Bloom Pro subscription is required.",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "The shop account is suspended.",
            },
            {
              code: "ACCOUNT_ARCHIVED",
              message: "The shop account is no longer active.",
            },
            {
              code: "ACCOUNT_RESTRICTED",
              message: "The shop account is restricted from API access.",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "The order was not found.",
            },
            {
              code: "FORBIDDEN",
              message: "The order is assigned to a different fulfilling shop.",
            },
            {
              code: "MISSING_DECLINE_REASON",
              message: "A decline reason is required.",
            },
            {
              code: "INVALID_DECLINE_REASON",
              message: "The supplied decline reason is not supported.",
            },
            {
              code: "MISSING_DECLINE_MESSAGE",
              message: 'A message is required when the reason is "OTHER".',
            },
            {
              code: "DECLINE_MESSAGE_TOO_LONG",
              message: "The decline message is too long.",
            },
            {
              code: "INVALID_TRANSITION",
              message: "The order cannot be declined from its current status.",
            },
            {
              code: "SERVER_ERROR",
              message: "The order could not be declined.",
            },
          ]}
        />

        <Endpoint
          method="POST"
          path="/api/external/v1/orders/:id/complete"
          description="Mark an accepted order as completed after fulfillment. Orders in ACCEPTED status can be completed."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={completeOrderRequest}
          exampleResponse={completeOrderResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "No API key was supplied.",
            },
            {
              code: "INVALID_API_KEY",
              message: "The API key is invalid or API access is disabled.",
            },
            {
              code: "PRO_REQUIRED",
              message: "An active Bloom Pro subscription is required.",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "The shop account is suspended.",
            },
            {
              code: "ACCOUNT_ARCHIVED",
              message: "The shop account is no longer active.",
            },
            {
              code: "ACCOUNT_RESTRICTED",
              message: "The shop account is restricted from API access.",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "The order was not found.",
            },
            {
              code: "FORBIDDEN",
              message: "The order is assigned to a different fulfilling shop.",
            },
            {
              code: "INVALID_TRANSITION",
              message:
                "Only an accepted order can be marked delivered/completed.",
            },
            {
              code: "SERVER_ERROR",
              message: "The order could not be completed.",
            },
          ]}
        />
      </Section>

      <Section title="Error Reference">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-700">
            All API errors use the same response envelope. The HTTP status
            indicates the category of failure, while <code>error.code</code>{" "}
            provides a stable machine-readable value for your integration.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-900">HTTP</th>
                  <th className="px-4 py-3 font-bold text-slate-900">Code</th>
                  <th className="px-4 py-3 font-bold text-slate-900">
                    Meaning
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    status: "400",
                    code: "INVALID_REQUEST",
                    meaning:
                      "The request contains invalid input or malformed data.",
                  },
                  {
                    status: "400",
                    code: "MISSING_DECLINE_REASON",
                    meaning:
                      "A decline request did not include a decline reason.",
                  },
                  {
                    status: "400",
                    code: "MISSING_DECLINE_MESSAGE",
                    meaning:
                      'The decline reason is "OTHER" but no explanatory message was supplied.',
                  },
                  {
                    status: "400",
                    code: "INVALID_DECLINE_REASON",
                    meaning: "The supplied decline reason is not supported.",
                  },
                  {
                    status: "400",
                    code: "DECLINE_MESSAGE_TOO_LONG",
                    meaning: "The decline message exceeds the allowed length.",
                  },
                  {
                    status: "401",
                    code: "MISSING_API_KEY",
                    meaning: "No API key was supplied with the request.",
                  },
                  {
                    status: "401",
                    code: "INVALID_API_KEY",
                    meaning:
                      "The supplied API key is invalid, disabled, or no longer active.",
                  },
                  {
                    status: "403",
                    code: "PRO_REQUIRED",
                    meaning:
                      "The shop does not currently have an active Bloom Pro subscription.",
                  },
                  {
                    status: "403",
                    code: "ACCOUNT_SUSPENDED",
                    meaning: "The GetBloomDirect shop account is suspended.",
                  },
                  {
                    status: "403",
                    code: "ACCOUNT_ARCHIVED",
                    meaning:
                      "The GetBloomDirect shop account is no longer active.",
                  },
                  {
                    status: "403",
                    code: "ACCOUNT_RESTRICTED",
                    meaning: "The shop account is restricted from API access.",
                  },
                  {
                    status: "403",
                    code: "SHOP_NOT_READY_TO_ACCEPT",
                    meaning:
                      "The fulfilling shop does not currently meet the requirements to accept orders.",
                  },
                  {
                    status: "403",
                    code: "FORBIDDEN",
                    meaning:
                      "The authenticated shop is not permitted to perform the requested action.",
                  },
                  {
                    status: "404",
                    code: "ORDER_NOT_FOUND",
                    meaning:
                      "The requested order does not exist or is not assigned to the authenticated fulfilling shop.",
                  },
                  {
                    status: "409",
                    code: "INVALID_TRANSITION",
                    meaning:
                      "The request conflicts with the order's current lifecycle status.",
                  },
                  {
                    status: "429",
                    code: "RATE_LIMIT_EXCEEDED",
                    meaning:
                      "Too many API requests were made in a short period of time.",
                  },
                  {
                    status: "500",
                    code: "SERVER_ERROR",
                    meaning:
                      "GetBloomDirect encountered an unexpected server-side error.",
                  },
                ].map((error) => (
                  <tr key={`${error.status}-${error.code}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                      {error.status}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-purple-700">
                      {error.code}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {error.meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-neutral-950 p-4 text-sm text-white">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Error response format
            </p>

            <pre className="overflow-x-auto">
              {`{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Illegal order transition: DECLINED → ACCEPTED"
  },
  "meta": {
    "timestamp": "2026-08-07T12:00:00.000Z",
    "version": "1.0"
  }
}`}
            </pre>
          </div>
        </div>
      </Section>

      <Section title="Webhooks">
        <div className="space-y-5 text-sm text-gray-700">
          <p>
            GetBloomDirect can send order events to your POS webhook endpoint.
            Webhooks are intended for real-time updates, while the Orders API
            can be used for recovery polling.
          </p>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-semibold">Supported events</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <code>order.created</code> — A new fulfillment order has been
                assigned to the shop.
              </li>
              <li>
                <code>order.accepted</code> — The fulfilling shop accepted the
                order.
              </li>
              <li>
                <code>order.declined</code> — The fulfilling shop declined the
                order.
              </li>
              <li>
                <code>order.completed</code> — The fulfilling shop marked the
                order delivered and completed.
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-blue-50 p-4">
            <p className="font-semibold">Request headers</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <code>X-Webhook-Signature</code>: HMAC SHA-256 signature of the
                raw request body.
              </li>
              <li>
                <code>X-Webhook-Event</code>: The event name.
              </li>
              <li>
                <code>X-Webhook-Delivery-Id</code>: Unique identifier for this
                delivery.
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="font-semibold">
              Acknowledgment and duplicate protection
            </p>
            <p className="mt-2">
              Return an HTTP 2xx response only after the event has been safely
              stored or processed.
            </p>
            <p className="mt-2">
              Store each <code>X-Webhook-Delivery-Id</code>. If the same
              delivery ID is received again, do not process it twice. Return
              another 2xx response so GetBloomDirect stops retrying it.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-semibold">Signature verification</p>
            <p className="mt-2">
              Calculate an HMAC SHA-256 digest using your webhook secret and the
              raw request body. Compare the hexadecimal digest with
              <code> X-Webhook-Signature</code>.
            </p>

            <pre className="mt-3 overflow-x-auto rounded bg-neutral-950 p-4 text-xs text-white">
              {`const expectedSignature = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(rawRequestBody)
                .digest("hex");`}
            </pre>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="font-semibold">Retry policy</p>
            <p className="mt-2">
              Failed deliveries are retried after approximately 1 minute, 5
              minutes, 15 minutes, 1 hour, and 6 hours, for a maximum of six
              total delivery attempts including the initial attempt.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">
              Missed webhook recovery
            </p>

            <p className="mt-2 text-emerald-900">
              Webhooks are a real-time notification mechanism, not the
              authoritative source of order state. If your integration misses a
              webhook or is offline, recover changes by polling the Orders
              endpoint with the <code>since</code> query parameter.
            </p>

            <pre className="mt-3 overflow-x-auto rounded bg-white p-3 text-xs text-slate-800">
              {`GET /api/external/v1/orders?since=2026-08-05T12:00:00.000Z`}
            </pre>

            <p className="mt-2 text-emerald-900">
              Always treat the latest order returned by the Orders API as the
              current GetBloomDirect state.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Delivery order</p>

            <p className="mt-2">
              Do not assume webhook deliveries will always arrive in lifecycle
              order. Network delays and retries can cause an older delivery to
              arrive after a newer one. Use the order&apos;s{" "}
              <code>timestamps.updated</code> value and periodically reconcile
              with the Orders API.
            </p>
          </div>

          <div className="rounded-xl bg-neutral-950 p-4 text-xs text-white">
            <pre className="overflow-x-auto">
              {`{
                "event": "order.completed",
                "data": {
                  "order": {
                    "id": "68935f106a9e3d72b872a101",
                    "orderNumber": "1001",
                    "status": "COMPLETED",
                    "decline": {
                      "reason": "",
                      "message": ""
                    },
                    "recipient": {
                      "fullName": "Jane Doe",
                      "address": "123 Main St",
                      "apt": "Apt 4B",
                      "city": "Buffalo",
                      "state": "NY",
                      "zip": "14201",
                      "phone": "555-123-4567",
                      "email": "jane@example.com",
                      "company": "Acme Corp",
                      "message": "Happy Birthday!"
                    },
                    "customer": {
                      "fullName": "John Smith",
                      "email": "john@example.com",
                      "phone": "555-987-6543"
                    },
                    "products": [
                      {
                        "name": "Red Roses",
                        "description": "Dozen premium roses",
                        "photo": "https://cdn.getbloomdirect.com/products/roses.jpg",
                        "qty": 1,
                        "taxable": true,
                        "price": 59.99
                      }
                    ],
                    "totals": {
                      "currency": "USD",
                      "productsSubtotal": 59.99,
                      "deliveryFee": 10,
                      "originatingFee": 0,
                      "tax": 4.8,
                      "orderTotal": 74.79,
                      "fulfillmentAmount": 69.99
                    },
                    "delivery": {
                      "date": "2026-08-08T00:00:00.000Z",
                      "window": {
                        "type": "specific",
                        "from": "09:00",
                        "to": "13:00"
                      },
                      "instructions": "Leave at front desk"
                    },
                    "paidAt": null,
                    "timestamps": {
                      "created": "2026-08-05T12:05:00.000Z",
                      "accepted": "2026-08-05T14:12:00.000Z",
                      "declined": null,
                      "completed": "2026-08-08T15:00:00.000Z",
                      "updated": "2026-08-08T15:00:00.000Z"
                    }
                  },
                  "actorShopId": "68935ee86a9e3d72b8729f11"
                },
                "meta": {
                  "timestamp": "2026-08-08T15:00:00.000Z",
                  "version": "1.0",
                  "deliveryId": "550e8400-e29b-41d4-a716-446655440000"
                }
              }`}
            </pre>
          </div>
        </div>
      </Section>
    </div>
  );
}
