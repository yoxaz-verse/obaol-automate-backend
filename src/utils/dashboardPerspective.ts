export type DashboardPerspective = "provided" | "sought";
export type AssociateDashboardRole = "buyer" | "seller" | "mediator";

export const resolveAssociateDashboardRoles = (
  capabilities: unknown,
  perspective: DashboardPerspective
): AssociateDashboardRole[] => {
  const values = new Set(
    (Array.isArray(capabilities) ? capabilities : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const buyerSide = perspective === "provided"
    ? values.has("buyer") || values.has("sourcing")
    : values.has("seller");
  const sellerSide = perspective === "provided"
    ? values.has("seller")
    : values.has("buyer");
  return [
    ...(buyerSide ? ["buyer" as const] : []),
    ...(sellerSide ? ["seller" as const] : []),
    ...(!buyerSide && !sellerSide ? ["mediator" as const] : []),
  ];
};
