import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  buildInquiryAccessFilter,
  canAccessInquiry,
  canOperatorActOnPerspective,
  getOperatorPerspective,
} from "../src/core/inquiry/inquiryAccessControl";

const inquiryFixture = () =>
  ({
    _id: new Types.ObjectId(),
    buyerAssociateId: new Types.ObjectId(),
    sellerAssociateId: new Types.ObjectId(),
    supplierOperatorId: "supplier-op",
    dealCloserOperatorId: "buyer-op",
    handlerOperatorId: "handler-op",
  } as any);

describe("inquiry access control operator perspective", () => {
  it("resolves buyer/supplier/both perspectives correctly", () => {
    const inquiry = inquiryFixture();

    expect(getOperatorPerspective(inquiry, "buyer-op")).toBe("buyer");
    expect(getOperatorPerspective(inquiry, "supplier-op")).toBe("supplier");
    expect(getOperatorPerspective(inquiry, "handler-op")).toBe("both");
    expect(getOperatorPerspective(inquiry, "random-op")).toBe("none");
  });

  it("enforces perspective action checks", () => {
    const inquiry = inquiryFixture();

    expect(canOperatorActOnPerspective(inquiry, "buyer-op", "buyer")).toBe(true);
    expect(canOperatorActOnPerspective(inquiry, "buyer-op", "supplier")).toBe(false);
    expect(canOperatorActOnPerspective(inquiry, "supplier-op", "supplier")).toBe(true);
    expect(canOperatorActOnPerspective(inquiry, "supplier-op", "buyer")).toBe(false);
    expect(canOperatorActOnPerspective(inquiry, "handler-op", "buyer")).toBe(true);
    expect(canOperatorActOnPerspective(inquiry, "handler-op", "supplier")).toBe(true);
    expect(canOperatorActOnPerspective(inquiry, "handler-op", "any")).toBe(true);
  });

  it("allows only assigned operators to access inquiry", () => {
    const inquiry = inquiryFixture();

    expect(
      canAccessInquiry(inquiry, { userId: "buyer-op", userRole: "Operator" })
    ).toBe(true);
    expect(
      canAccessInquiry(inquiry, { userId: "supplier-op", userRole: "team" })
    ).toBe(true);
    expect(
      canAccessInquiry(inquiry, { userId: "handler-op", userRole: "operator" })
    ).toBe(true);
    expect(
      canAccessInquiry(inquiry, { userId: "creator-only", userRole: "operator" })
    ).toBe(false);
  });

  it("builds operator access filter without createdBy fallback", () => {
    const filter = buildInquiryAccessFilter({
      userId: "op-1",
      userRole: "Operator",
    });
    const serialized = JSON.stringify(filter);

    expect(serialized).toContain("supplierOperatorId");
    expect(serialized).toContain("dealCloserOperatorId");
    expect(serialized).toContain("handlerOperatorId");
    expect(serialized).not.toContain("createdBy");
  });
});
