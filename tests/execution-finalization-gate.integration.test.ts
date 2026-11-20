import request from "supertest";
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import app from "../src/app";
import { InquiryModel } from "../src/database/models/enquiry";
import { IncotermModel } from "../src/database/models/incoterm";
import { PaymentTermModel } from "../src/database/models/paymentTerm";
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
  it("persists validated trade terms through the inquiry update endpoint", async () => {
    const token = await adminToken();
    const inquiry = await InquiryModel.create({
      productId: new Types.ObjectId(),
      buyerAssociateId: new Types.ObjectId(),
      sellerAssociateId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
    });
    const suffix = new Types.ObjectId().toString().slice(-8);
    const incoterm = await IncotermModel.create({ code: `T${suffix.slice(0, 4)}`, name: `Test ${suffix}` });
    const paymentTerm = await PaymentTermModel.create({
      label: `Test payment ${suffix}`,
      applicableIncoterms: [incoterm.code],
      milestones: [{ label: "Advance", percent: 100, triggerType: "DOC", triggerValue: "PROFORMA_INVOICE" }],
    });

    const response = await api
      .patch(`/api/v1/web/inquiries/${inquiry._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ preferredIncoterm: incoterm._id, paymentTermId: paymentTerm._id });

    expect(response.status).toBe(200);
    const saved = await InquiryModel.findById(inquiry._id).lean();
    expect(String((saved as any)?.preferredIncoterm)).toBe(String(incoterm._id));
    expect(String((saved as any)?.paymentTermId)).toBe(String(paymentTerm._id));
  });

  it("rejects invalid trade-term references without changing the inquiry", async () => {
    const token = await adminToken();
    const inquiry = await InquiryModel.create({
      productId: new Types.ObjectId(),
      buyerAssociateId: new Types.ObjectId(),
      sellerAssociateId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
    });

    const response = await api
      .patch(`/api/v1/web/inquiries/${inquiry._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ paymentTermId: new Types.ObjectId() });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Selected payment term was not found.");
    const unchanged = await InquiryModel.findById(inquiry._id).lean();
    expect((unchanged as any)?.paymentTermId).toBeNull();
  });

  it("does not allow the workflow action to bypass missing trade terms", async () => {
    const token = await adminToken();
    const inquiry = await InquiryModel.create({
      productId: new Types.ObjectId(),
      buyerAssociateId: new Types.ObjectId(),
      sellerAssociateId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
    });

    const response = await api
      .patch(`/api/v1/web/inquiries/${inquiry._id}/actions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ actionKey: "RESPONSIBILITIES_FINALIZED" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "RESPONSIBILITY_FINALIZATION_INCOMPLETE",
      missingFields: expect.arrayContaining(["preferredIncoterm", "paymentTermId"]),
    });
    const unchanged = await InquiryModel.findById(inquiry._id).lean();
    expect((unchanged as any)?.responsibilitiesFinalizedAt).toBeNull();
  });

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
