import type { ImportListingStatus } from "../interfaces/importListing";

export const resolveImportListingAvailabilityStatus = (
  currentStatus: ImportListingStatus,
  availableQuantity: number,
  reservedQuantity: number
): ImportListingStatus => {
  if (currentStatus === "CLOSED") return "CLOSED";
  if (availableQuantity <= 0) return "FULL";
  if (reservedQuantity > 0) return "PARTIAL";
  return "OPEN";
};
