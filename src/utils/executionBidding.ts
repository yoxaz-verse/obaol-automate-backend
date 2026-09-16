export const EXECUTION_TO_SUBFLOW: Record<string, string> = {
  PROCUREMENT: "PROCUREMENT",
  TRANSPORTATION: "INLAND_TRANSPORTATION",
  SHIPPING: "FREIGHT_FORWARDING",
  PACKAGING: "PACKAGING",
  CERTIFICATION: "CERTIFICATION",
  QUALITY_TESTING: "QUALITY_TESTING",
  WAREHOUSE: "WAREHOUSING",
};

export type BiddingPhase = "UPCOMING" | "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED";
export type ProviderMatchLevel = "district" | "state" | "country" | "capability_fallback";

export const MAX_BID_NOTE_LENGTH = 500;

export const normalizeExecutionType = (value: unknown) => String(value || "").trim().toUpperCase();

export const getExecutionSubflowType = (value: unknown) =>
  EXECUTION_TO_SUBFLOW[normalizeExecutionType(value)] || normalizeExecutionType(value);

export const isPositiveFiniteBid = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const resolveBiddingPhase = (params: {
  taskStatus?: unknown;
  currentStageOrder?: number;
  startStageOrder?: number;
  endStageOrder?: number;
}): BiddingPhase => {
  const status = String(params.taskStatus || "OPEN").toUpperCase();
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "AWARDED";
  const { currentStageOrder, startStageOrder, endStageOrder } = params;
  if ([currentStageOrder, startStageOrder, endStageOrder].every((value) => typeof value === "number")) {
    if ((currentStageOrder as number) < (startStageOrder as number)) return "UPCOMING";
    if ((currentStageOrder as number) > (endStageOrder as number)) return "CLOSED";
  }
  return "OPEN";
};
