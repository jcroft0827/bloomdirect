export type BloomWebsiteOrderStatus =
  | "placed"
  | "confirmed"
  | "in_preparation"
  | "preparation_complete"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivery_attempted"
  | "fulfilled"
  | "canceled";

export type BloomWebsiteFulfillmentType = "delivery" | "pickup";

export type BloomWebsiteStatusNotificationPolicy = {
  designing: boolean;
  ready: boolean;
  readyForPickup: boolean;
  outForDelivery: boolean;
  deliveryAttempted: boolean;
  delivered: boolean;
  pickedUp: boolean;
  canceled: boolean;
};

export const DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS: BloomWebsiteStatusNotificationPolicy = {
  designing: false,
  ready: false,
  readyForPickup: true,
  outForDelivery: true,
  deliveryAttempted: true,
  delivered: true,
  pickedUp: true,
  canceled: true,
};

export function getBloomWebsiteOrderStatusLabel(
  status: BloomWebsiteOrderStatus | string,
  fulfillmentType: BloomWebsiteFulfillmentType,
) {
  switch (status) {
    case "placed":
    case "confirmed":
      return "New";
    case "in_preparation":
      return "Designing";
    case "preparation_complete":
      return fulfillmentType === "pickup" ? "Ready for Pickup" : "Ready";
    case "ready_for_pickup":
      return "Ready for Pickup";
    case "out_for_delivery":
      return "Out for Delivery";
    case "delivery_attempted":
      return "Delivery Attempted";
    case "fulfilled":
      return fulfillmentType === "pickup" ? "Picked Up" : "Delivered";
    case "canceled":
      return "Canceled";
    default:
      return "Order Update";
  }
}

export function getBloomWebsiteStatusNotificationKey(
  status: BloomWebsiteOrderStatus,
  fulfillmentType: BloomWebsiteFulfillmentType,
): keyof BloomWebsiteStatusNotificationPolicy | null {
  switch (status) {
    case "in_preparation":
      return "designing";
    case "preparation_complete":
      return "ready";
    case "ready_for_pickup":
      return "readyForPickup";
    case "out_for_delivery":
      return "outForDelivery";
    case "delivery_attempted":
      return "deliveryAttempted";
    case "fulfilled":
      return fulfillmentType === "pickup" ? "pickedUp" : "delivered";
    case "canceled":
      return "canceled";
    default:
      return null;
  }
}

export function resolveBloomWebsiteStatusNotificationPolicy(
  value: Partial<BloomWebsiteStatusNotificationPolicy> | null | undefined,
  legacySendDeliveryConfirmation = true,
): BloomWebsiteStatusNotificationPolicy {
  return {
    ...DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS,
    ...(value || {}),
    delivered:
      value?.delivered ??
      (legacySendDeliveryConfirmation !== false &&
        DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.delivered),
  };
}

export function shouldNotifyBloomWebsiteStatus(
  policy: Partial<BloomWebsiteStatusNotificationPolicy> | null | undefined,
  status: BloomWebsiteOrderStatus,
  fulfillmentType: BloomWebsiteFulfillmentType,
  legacySendDeliveryConfirmation = true,
) {
  const key = getBloomWebsiteStatusNotificationKey(status, fulfillmentType);
  if (!key) return false;

  const resolved = resolveBloomWebsiteStatusNotificationPolicy(
    policy,
    legacySendDeliveryConfirmation,
  );

  return resolved[key];
}
