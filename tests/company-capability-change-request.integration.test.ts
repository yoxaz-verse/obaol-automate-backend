import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import { createAssociate } from "./helpers/authFixtures";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { CompanyFunctionModel } from "../src/database/models/companyFunction";
import { CompanyCapabilityChangeRequestModel } from "../src/database/models/companyCapabilityChangeRequest";

const api = request(app);
const endpoint = "/api/v1/web/company-capability-change-requests";
const cookieFor = (user: any) => `auth_token=${jwt.sign(
  { id: String(user._id), email: user.email, role: "Associate" },
  process.env.JWT_SECRET as string
)}`;

const setupCompany = async () => {
  const suffix = new mongoose.Types.ObjectId().toHexString();
  const company = await AssociateCompanyModel.create({
    name: `Capability Company ${suffix}`,
    email: `capability.${suffix}@example.com`,
    phone: "+919811111111",
    phoneSecondary: "+919822222222",
    registrationStatus: "APPROVED",
    isApproved: true,
  });
  const associate = await createAssociate({ associateCompany: company._id });
  const provided = await CompanyFunctionModel.findOneAndUpdate(
    { slug: "buyer" },
    { $setOnInsert: { name: "Buyer", slug: "buyer", isActive: true } },
    { upsert: true, new: true }
  );
  const sought = await CompanyFunctionModel.findOneAndUpdate(
    { slug: "seller" },
    { $setOnInsert: { name: "Seller", slug: "seller", isActive: true } },
    { upsert: true, new: true }
  );
  const body = {
    requestedProvidedFunctionIds: [String(provided._id)],
    requestedSoughtFunctionIds: [String(sought._id)],
    requestedProvidedFunctionPriorities: [String(provided._id)],
    requestedSoughtFunctionPriorities: [String(sought._id)],
  };
  return { company, associate, body };
};

const createDecision = (input: { company: any; associate: any; body: any; status: "APPROVED" | "REJECTED" | "PENDING_REVIEW"; reviewedAt?: Date; createdAt?: Date }) =>
  CompanyCapabilityChangeRequestModel.create({
    companyId: input.company._id,
    requesterAssociateId: input.associate._id,
    ...input.body,
    status: input.status,
    reviewedAt: input.reviewedAt || null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });

describe("company capability change submission eligibility", () => {
  it("returns a stable conflict while a request is pending", async () => {
    const context = await setupCompany();
    await createDecision({ ...context, status: "PENDING_REVIEW" });

    const response = await api.post(endpoint).set("Cookie", cookieFor(context.associate)).send(context.body);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, code: "PENDING_REVIEW", nextEligibleAt: null });
  });

  it("blocks for seven days after approval and exposes the next eligible time", async () => {
    const context = await setupCompany();
    const reviewedAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await createDecision({ ...context, status: "APPROVED", reviewedAt });

    const list = await api.get(endpoint).set("Cookie", cookieFor(context.associate));
    const create = await api.post(endpoint).set("Cookie", cookieFor(context.associate)).send(context.body);

    expect(list.status).toBe(200);
    expect(list.body.meta.eligibility).toMatchObject({ canSubmit: false, reason: "APPROVAL_COOLDOWN" });
    expect(list.body.meta.eligibility.nextEligibleAt).toBe(new Date(reviewedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
    expect(create.status).toBe(409);
    expect(create.body).toMatchObject({ code: "APPROVAL_COOLDOWN", nextEligibleAt: list.body.meta.eligibility.nextEligibleAt });
  });

  it("allows submission after the cooldown and immediately after the latest rejection", async () => {
    const afterCooldown = await setupCompany();
    await createDecision({ ...afterCooldown, status: "APPROVED", reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) });
    expect((await api.post(endpoint).set("Cookie", cookieFor(afterCooldown.associate)).send(afterCooldown.body)).status).toBe(201);

    const rejected = await setupCompany();
    await createDecision({ ...rejected, status: "APPROVED", reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
    await createDecision({ ...rejected, status: "REJECTED", reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    expect((await api.post(endpoint).set("Cookie", cookieFor(rejected.associate)).send(rejected.body)).status).toBe(201);
  });

  it("keeps the full history newest-first and permits only one concurrent pending request", async () => {
    const history = await setupCompany();
    const older = await createDecision({ ...history, status: "REJECTED", reviewedAt: new Date("2026-01-01T00:00:00.000Z"), createdAt: new Date("2026-01-01T00:00:00.000Z") });
    const newer = await createDecision({ ...history, status: "REJECTED", reviewedAt: new Date("2026-02-01T00:00:00.000Z"), createdAt: new Date("2026-02-01T00:00:00.000Z") });
    const list = await api.get(endpoint).set("Cookie", cookieFor(history.associate));
    expect(list.body.data.map((row: any) => row._id)).toEqual([String(newer._id), String(older._id)]);

    const concurrent = await setupCompany();
    await CompanyCapabilityChangeRequestModel.collection.createIndex(
      { companyId: 1 },
      { unique: true, partialFilterExpression: { status: "PENDING_REVIEW", isDeleted: false } }
    );
    const responses = await Promise.all([
      api.post(endpoint).set("Cookie", cookieFor(concurrent.associate)).send(concurrent.body),
      api.post(endpoint).set("Cookie", cookieFor(concurrent.associate)).send(concurrent.body),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await CompanyCapabilityChangeRequestModel.countDocuments({ companyId: concurrent.company._id, status: "PENDING_REVIEW" })).toBe(1);
  });
});
