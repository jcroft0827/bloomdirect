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
            <code className="text-xs">
              PENDING_ACCEPTANCE → ACCEPTED_AWAITING_PAYMENT →
              PAID_AWAITING_FULFILLMENT → COMPLETED
            </code>
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
              If <b>declineReason = "OTHER"</b>, then <b>declineMessage</b> is
              required.
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
              All external v1 API requests must include your shop's API key.
            </p>

            <div className="rounded-xl bg-neutral-950 p-4 text-sm text-white font-mono overflow-x-auto">
              <pre>{`x-api-key: YOUR_API_KEY`}</pre>
            </div>

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
          path="/v1/orders"
          description="Retrieve incoming orders assigned to your fulfilling shop. Use the optional since parameter to return orders updated after a specific timestamp, and limit to control the number of results."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={getOrdersRequest}
          exampleResponse={getOrdersResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "Your API key is missing!",
            },
            {
              code: "INVALID_API_KEY",
              message: "You are trying to use an invalid API key",
            },
            {
              code: "PRO_REQUIRED",
              message: "This feature requires an active Pro subscription",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "Account suspended",
            },
            {
              code: "INVALID_REQUEST",
              message: "Invalid since value or limit.",
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
            {`GET /v1/orders?since=2026-07-15T12:00:00.000Z&limit=100`}
          </pre>
        </div>

        <Endpoint
          method="POST"
          path="/v1/orders/:id/accept"
          description="Accept an incoming order."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={acceptOrderRequest}
          exampleResponse={acceptOrderResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "Your API key is missing!",
            },
            {
              code: "INVALID_API_KEY",
              message: "You are trying to use an invalid API key",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "Account suspended",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "Order not found",
            },
            {
              code: "UNAUTHORIZED",
              message: "Not authorized",
            },
            {
              code: "INVALID_REQUEST",
              message: "Something went wrong",
            },
          ]}
        />

        <Endpoint
          method="POST"
          path="/v1/orders/:id/decline"
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
              message: "Your API key is missing!",
            },
            {
              code: "INVALID_API_KEY",
              message: "You are trying to use an invalid API key",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "Account suspended",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "Order not found",
            },
            {
              code: "UNAUTHORIZED",
              message: "Not authorized",
            },
            {
              code: "MISSING_DECLINE_REASON",
              message: "Decline reason required",
            },
            {
              code: "MISSING_DECLINE_MESSAGE",
              message: "Message required",
            },
            {
              code: "INVALID_REQUEST",
              message: "Something went wrong",
            },
          ]}
        />

        <Endpoint
          method="POST"
          path="/v1/orders/:id/complete"
          description="Mark a paid fulfillment order as completed. Only orders in PAID_AWAITING_FULFILLMENT status can be completed."
          headers={{
            "x-api-key": "YOUR_API_KEY",
          }}
          exampleRequest={completeOrderRequest}
          exampleResponse={completeOrderResponse}
          errors={[
            {
              code: "MISSING_API_KEY",
              message: "Your API key is missing!",
            },
            {
              code: "INVALID_API_KEY",
              message: "You are trying to use an invalid API key",
            },
            {
              code: "ACCOUNT_SUSPENDED",
              message: "Account suspended",
            },
            {
              code: "ORDER_NOT_FOUND",
              message: "Order not found",
            },
            {
              code: "UNAUTHORIZED",
              message: "Not authorized",
            },
            {
              code: "INVALID_REQUEST",
              message: "Something went wrong",
            },
            {
              code: "ORDER_NOT_PAID",
              message:
                "The order must be marked paid before it can be completed.",
            },
            {
              code: "INVALID_TRANSITION",
              message: "The order cannot be completed from its current status.",
            },
          ]}
        />
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
                <code>order.paid</code> — The originating shop marked the
                accepted order as paid.
              </li>
              <li>
                <code>order.completed</code> — The fulfilling shop marked the
                order delivered and completed.
              </li>
            </ul>
            <p className="mt-3 text-gray-600">
              The <code>order.paid</code> event signals that the order is
              eligible to be completed after fulfillment. The POS cannot mark
              payment through API v1.
            </p>
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

          <div className="rounded-xl bg-neutral-950 p-4 text-xs text-white">
            <pre className="overflow-x-auto">
              {`{
                "event": "order.completed",
                "data": {
                  "order": {
                    "id": "order_id",
                    "orderNumber": "1001",
                    "status": "COMPLETED",
                    "paid": true,
                    "paidAt": "2026-07-16T14:30:00.000Z"
                  },
                  "actorShopId": "shop_id"
                },
                "meta": {
                  "timestamp": "2026-07-16T15:00:00.000Z",
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
