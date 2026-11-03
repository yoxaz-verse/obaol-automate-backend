import { describe, expect, it } from "vitest";
import { isActiveExecutionBiddingPhase, isPositiveFiniteBid, resolveBiddingPhase } from "./executionBidding";

describe("execution bidding lifecycle", () => {
  it("treats only OPEN as active", () => {
    expect(isActiveExecutionBiddingPhase("OPEN")).toBe(true);
    expect(isActiveExecutionBiddingPhase("UPCOMING")).toBe(false);
    expect(isActiveExecutionBiddingPhase("CLOSED")).toBe(false);
    expect(isActiveExecutionBiddingPhase("AWARDED")).toBe(false);
    expect(isActiveExecutionBiddingPhase("CANCELLED")).toBe(false);
  });

  it("resolves upcoming, open, closed, awarded, and cancelled phases", () => {
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 1, startStageOrder: 2, endStageOrder: 4 })).toBe("UPCOMING");
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 3, startStageOrder: 2, endStageOrder: 4 })).toBe("OPEN");
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 5, startStageOrder: 2, endStageOrder: 4 })).toBe("CLOSED");
    expect(resolveBiddingPhase({ taskStatus: "IN_PROGRESS" })).toBe("CLOSED");
    expect(resolveBiddingPhase({ taskStatus: "COMPLETED" })).toBe("AWARDED");
    expect(resolveBiddingPhase({ taskStatus: "CANCELLED" })).toBe("CANCELLED");
  });

  it("accepts only positive finite bid amounts", () => {
    expect(isPositiveFiniteBid(1)).toBe(true);
    expect(isPositiveFiniteBid(0)).toBe(false);
    expect(isPositiveFiniteBid(-1)).toBe(false);
    expect(isPositiveFiniteBid(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
