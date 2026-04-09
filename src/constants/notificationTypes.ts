export const NotificationTypes = {
  INQUIRY_CREATED: "INQUIRY_CREATED",
  INQUIRY_ASSIGNED: "INQUIRY_ASSIGNED",
  INQUIRY_STATUS_CHANGED: "INQUIRY_STATUS_CHANGED",
  INQUIRY_SUPPLIER_ACCEPTED: "INQUIRY_SUPPLIER_ACCEPTED",
  ORDER_CONVERTED: "ORDER_CONVERTED",
  VARIANT_RATE_LIVE: "VARIANT_RATE_LIVE",
  EXECUTION_TASKS_CREATED: "EXECUTION_TASKS_CREATED",
  APPROVAL_REQUESTED: "APPROVAL_REQUESTED",
  GENERAL_MESSAGE: "GENERAL_MESSAGE",
} as const;

export const NotificationEntityTypes = {
  INQUIRY: "INQUIRY",
  ORDER: "ORDER",
  VARIANT_RATE: "VARIANT_RATE",
  APPROVAL: "APPROVAL",
  SYSTEM: "SYSTEM",
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];
export type NotificationEntityType = (typeof NotificationEntityTypes)[keyof typeof NotificationEntityTypes];
