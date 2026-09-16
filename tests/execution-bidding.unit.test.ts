import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  getExecutionSubflowType,
  isPositiveFiniteBid,
  resolveBiddingPhase,
} from "../src/utils/executionBidding";
import { filterInquiryFields, UserRole } from "../src/core/inquiry/inquiryAccessControl";
import { requestTypeToCapabilityAliases } from "../src/utils/companyCapabilities";

describe("execution bidding rules", () => {
  it("normalizes execution services to their configured subflows", () => {
    expect(getExecutionSubflowType("TRANSPORTATION")).toBe("INLAND_TRANSPORTATION");
    expect(getExecutionSubflowType("SHIPPING")).toBe("FREIGHT_FORWARDING");
    expect(getExecutionSubflowType("PACKAGING")).toBe("PACKAGING");
  });

  it("matches shipping, certification and warehouse tasks to canonical capabilities", () => {
    expect(requestTypeToCapabilityAliases("SHIPPING")).toContain("TRANSPORTATION");
    expect(requestTypeToCapabilityAliases("CERTIFICATION")).toContain("QUALITY_TESTING");
    expect(requestTypeToCapabilityAliases("WAREHOUSE")).toContain("WAREHOUSING");
  });

  it("accepts only positive finite bid amounts", () => {
    expect(isPositiveFiniteBid(12.5)).toBe(true);
    expect(isPositiveFiniteBid(0)).toBe(false);
    expect(isPositiveFiniteBid(-1)).toBe(false);
    expect(isPositiveFiniteBid(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isPositiveFiniteBid("12")).toBe(false);
  });

  it("derives upcoming, open, closed, awarded and cancelled phases", () => {
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 1, startStageOrder: 2, endStageOrder: 4 })).toBe("UPCOMING");
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 3, startStageOrder: 2, endStageOrder: 4 })).toBe("OPEN");
    expect(resolveBiddingPhase({ taskStatus: "OPEN", currentStageOrder: 5, startStageOrder: 2, endStageOrder: 4 })).toBe("CLOSED");
    expect(resolveBiddingPhase({ taskStatus: "COMPLETED" })).toBe("AWARDED");
    expect(resolveBiddingPhase({ taskStatus: "CANCELLED" })).toBe("CANCELLED");
  });
});

describe("execution bid privacy", () => {
  it("returns only an invited provider's tasks and own bids", () => {
    const providerCompany = new Types.ObjectId();
    const competitorCompany = new Types.ObjectId();
    const associateId = new Types.ObjectId();
    const inquiry: any = {
      _id: new Types.ObjectId(),
      status: "IN_DISCUSSION",
      executionInquiries: [
        {
          type: "PACKAGING",
          candidateProviders: [providerCompany, competitorCompany],
          bids: [
            { company: providerCompany, amount: 100, note: "mine" },
            { company: competitorCompany, amount: 90, note: "secret" },
          ],
        },
        { type: "SHIPPING", candidateProviders: [competitorCompany], bids: [] },
      ],
    };
    const result: any = filterInquiryFields(inquiry, {
      userId: associateId,
      associateId,
      associateCompanyId: providerCompany,
      userRole: UserRole.ASSOCIATE,
    });
    expect(result.executionInquiries).toHaveLength(1);
    expect(result.executionInquiries[0].candidateProviders).toBeUndefined();
    expect(result.executionInquiries[0].bids).toHaveLength(1);
    expect(result.executionInquiries[0].bids[0].note).toBe("mine");
  });
});
