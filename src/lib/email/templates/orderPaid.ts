import { OrderPaidVariables } from "../email-types";

export function orderPaidTemplate(vars: OrderPaidVariables) {
  return {
    subject: `Order ${vars.orderNumber} has been paid 💸`,
    html: `
      <p>Good news!</p>

      <p>
        Order <strong>${vars.orderNumber}</strong> has been paid.
      </p>

      <p>
        <strong>Amount:</strong> $${vars.amount.toFixed(2)}<br/>
        <strong>Paid at:</strong> ${vars.paidAt}
      </p>

      <p>
        Thanks for using BloomDirect 🌸
      </p>
    `,
  };
}
