// /lib/email/templates/index.ts

import {
  EmailType,
  EmailVariablesMap,
} from "../email-types";

import { inviteFloristTemplate } from "./inviteFlorist";
import { orderSentTemplate } from "./orderSent";
import { orderReassignedTemplate } from "./orderReassigned";
import { orderPaidTemplate } from "./orderPaid";

export function renderEmail<T extends EmailType>(
  type: T,
  variables: EmailVariablesMap[T]
): { subject: string; html: string } {
  switch (type) {
    case "INVITE_FLORIST":
      return inviteFloristTemplate(
        variables as EmailVariablesMap["INVITE_FLORIST"]
      );

    case "ORDER_SENT":
      return orderSentTemplate(
        variables as EmailVariablesMap["ORDER_SENT"]
      );

    case "ORDER_REASSIGNED":
      return orderReassignedTemplate(
        variables as EmailVariablesMap["ORDER_REASSIGNED"]
      );

    case "ORDER_PAID":
      return orderPaidTemplate(
        variables as EmailVariablesMap["ORDER_PAID"]
      );

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled email type: ${_exhaustive}`);
    }
  }
}
