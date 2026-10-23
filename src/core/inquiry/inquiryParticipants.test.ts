import { describe, expect, it } from "vitest";
import {
  buildInquiryAccessContext,
  getPartyLocation,
  resolveTradeInputContributor,
} from "./inquiryParticipants";

describe("inquiry participant domain rules", () => {
  it("builds the legacy-compatible associate access context", () => {
    expect(buildInquiryAccessContext({ id: "associate-1", role: "Associate", associateCompany: "company-1" })).toEqual({
      userId: "associate-1",
      userRole: "Associate",
      associateId: "associate-1",
      associateCompanyId: "company-1",
    });
  });

  it("resolves buyer, seller, and platform contribution ownership", () => {
    const inquiry = { buyerAssociateId: { _id: "buyer-1" }, sellerAssociateId: "seller-1" };
    expect(resolveTradeInputContributor({ id: "buyer-1", role: "Associate" }, inquiry)).toBe("BUYER");
    expect(resolveTradeInputContributor({ associateId: "seller-1", role: "Associate" }, inquiry)).toBe("SELLER");
    expect(resolveTradeInputContributor({ id: "operator-1", role: "Operator" }, inquiry)).toBe("OBAOL");
  });

  it("uses a company override and returns a safe empty location", () => {
    expect(getPartyLocation({}, undefined)).toEqual({ district: null, state: null, label: "Location not provided" });
    expect(getPartyLocation({ district: { name: "Old" } }, { district: { name: "Kochi" }, state: { name: "Kerala" } })).toEqual({
      district: "Kochi",
      state: "Kerala",
      label: "Kochi, Kerala",
    });
  });
});
