import { OrderReassignedVariables } from "../email-types";

export function orderReassignedTemplate(
  variables: OrderReassignedVariables
): { subject: string; html: string } {
  const {
    orderNumber,
    oldShopName: originalShopName,
    newShopName,
    reassignedBy,
  } = variables;

  return {
    subject: `Order #${orderNumber} has been reassigned to your shop`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Order Reassigned</h2>

        <p>
          Order <strong>#${orderNumber}</strong> has been reassigned
          from <strong>${originalShopName}</strong> to
          <strong>${newShopName}</strong>.
        </p>

        <p>
          This reassignment was made by
          <strong>${reassignedBy}</strong>.
        </p>

        <p>
          Please log into BloomDirect to review the order details and
          take the next steps.
        </p>

        <p style="margin-top: 24px;">
          <a
            href="https://www.getbloomdirect.com/dashboard/incoming"
            style="
              display: inline-block;
              padding: 12px 20px;
              background-color: #6d28d9;
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            View Order
          </a>
        </p>

        <p style="margin-top: 32px; color: #555;">
          — The BloomDirect Team
        </p>
      </div>
    `,
  };
}
