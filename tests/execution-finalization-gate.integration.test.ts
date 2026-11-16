import request from "supertest";
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import app from "../src/app";
import { InquiryModel } from "../src/database/models/enquiry";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAdmin } from "./helpers/authFixtures";

const api = request(app);

const adminToken = async () => {
  const admin = await createAdmin();
  return generateJWTToken({ ...admin.toObject(), role: "Admin" } as any, "1h");
};

const createExecutionInquiry = (finalized: boolean) => {
  const buyerAssociateId = new Types.ObjectId();
  let sellerAssociateId = new Types.ObjectId();
  while (sellerAssociateId.equals(buyerAssociateId)) sellerAssociateId = new Types.ObjectId();

  return InquiryModel.create({
    productId: new Types.ObjectId(),
    buyerAssociateId,
    sellerAssociateId,
    createdBy: new Types.ObjectId(),
    responsibilitiesFinalizedAt: finalized ? new Date() : null,
    executionInquiries: [{
      type: "PACKAGING",
      ownerBy: "obaol",
      status: "OPEN",
      title: finalized ? "Finalized packaging" : "Premature packaging",
      candidateProviders: [new Types.ObjectId()],
      bids: [],
    }],
  });
};

describe("execution responsibility-finalization gate", () => {
  it("reports missing trade terms without finalizing or creating execution tasks", async () => {
    const token = await adminToken();
    const inquiry = await InquiryModel.create({
      productId: new Types.ObjectId(),
      buyerAssociateId: new Types.ObjectId(),
      sellerAssociateId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
      sellerAcceptedAt: new Date(),
      buyerConfirmedAt: new Date(),
      responsibilityPlan: {
        procurementBy: "obaol",
        qualityTestingBy: "obaol",
        packagingBy: "obaol",
        transportBy: "obaol",
      },
      executionContext: {
        tradeType: "DOMESTIC",
        originState: new Types.ObjectId(),
        originDistrict: new Types.ObjectId(),
        destinationState: new Types.ObjectId(),
        destinationDistrict: new Types.ObjectId(),
      },
      packagingSpecifications: "25 kg food-grade bags on pallets",
    });

    const response = await api
      .patch(`/api/v1/web/inquiries/${inquiry._id}/finalize-responsibilities`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      code: "RESPONSIBILITY_FINALIZATION_INCOMPLETE",
      missingFields: expect.arrayContaining(["preferredIncoterm", "paymentTermId"]),
    });
    const unchanged = await InquiryModel.findById(inquiry._id).lean();
    expect((unchanged as any)?.responsibilitiesFinalizedAt).toBeNull();
    expect((unchanged as any)?.executionInquiries || []).toHaveLength(0);
  });

  it("returns only finalized enquiries in both execution-panel list endpoints", async () => {
    const token = await adminToken();
    const hidden = await createExecutionInquiry(false);
    const visible = await createExecutionInquiry(true);

    const [dealExecution, bidding] = await Promise.all([
      api
        .get("/api/v1/web/inquiries")
        .set("Authorization", `Bearer ${token}`)
        .query({ hasExecution: true }),
      api
        .get("/api/v1/web/inquiries/execution-bids")
        .set("Authorization", `Bearer ${token}`)
        .query({ state: "active" }),
    ]);

    expect(dealExecution.status).toBe(200);
    expect(dealExecution.body.data.map((row: any) => String(row._id))).toEqual([String(visible._id)]);
    expect(dealExecution.body.data.map((row: any) => String(row._id))).not.toContain(String(hidden._id));

    expect(bidding.status).toBe(200);
    expect(bidding.body.data).toHaveLength(1);
    expect(bidding.body.data[0]).toMatchObject({
      enquiryId: String(visible._id),
      title: "Finalized packaging",
      bidCount: 0,
      phase: "OPEN",
    });
  });

  it("rejects every execution-task mutation before responsibilities are finalized", async () => {
    const token = await adminToken();
    const inquiry = await createExecutionInquiry(false);
    const taskId = String((inquiry as any).executionInquiries[0]._id);

    const response = await api
      .patch(`/api/v1/web/inquiries/${inquiry._id}/execution-inquiries/PACKAGING`)
      .set("Authorization", `Bearer ${token}`)
      .send({ taskId, status: "IN_PROGRESS" });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      message: "Responsibilities must be finalized before execution tasks can be updated.",
    });

    const unchanged = await InquiryModel.findById(inquiry._id).lean();
    expect((unchanged as any)?.executionInquiries?.[0]?.status).toBe("OPEN");
    expect((unchanged as any)?.executionInquiries?.[0]?.bids || []).toHaveLength(0);
  });
});
