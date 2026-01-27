import { OrderSentVariables } from "../email-types";

export function orderSentTemplate(vars: OrderSentVariables) {
  return {
    subject: `New Order ${vars.orderNumber} from ${vars.senderShopName}`,
    html: `
      <p>You’ve received a new order!</p>

      <p>
        <strong>Order:</strong> ${vars.orderNumber}<br/>
        <strong>From:</strong> ${vars.senderShopName}<br/>
        <strong>To:</strong> ${vars.recipientShopName}
      </p>

      <p>
        Log in to BloomDirect to accept or decline this order.
      </p>
    `,
  };
}
