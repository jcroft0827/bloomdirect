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
          description="Retrieve incoming orders assigned to your fulfilling shop."
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
          ]}
        />

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
              code: "READ_ONLY_MODE",
              message: "Upgrade to Pro to modify orders",
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
              code: "READ_ONLY_MODE",
              message: "Upgrade to Pro to modify orders",
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
          description="Mark an eligible order as completed after fulfillment."
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
              code: "READ_ONLY_MODE",
              message: "Upgrade to Pro to modify orders",
            },
            {
              code: "INVALID_REQUEST",
              message: "Something went wrong",
            },
          ]}
        />
      </Section>
    </div>
  );
}
