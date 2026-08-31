import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAssociate, createOperator } from "./helpers/authFixtures";

const api = request(app);

const adminToken = () =>
  generateJWTToken(
    {
      _id: new mongoose.Types.ObjectId(),
      email: "admin@example.com",
      role: "Admin",
    } as any,
    "1h"
  );

const getApprovalIds = async (path: string, token = adminToken()) => {
  const res = await api
    .get(path)
    .set("Authorization", `Bearer ${token}`)
    .query({ status: "PENDING_REVIEW", page: 1, limit: 10 });

  expect(res.status).toBe(200);
  return (res.body?.data || []).map((row: any) => String(row._id));
};

describe("Approval list ordering", () => {
  it("lists pending associates by newest approval request first", async () => {
    const olderCreatedNewerRequested = await createAssociate({
      name: "Older Created Newer Requested",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      approvalRequestedAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    const newerCreatedOlderRequested = await createAssociate({
      name: "Newer Created Older Requested",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      approvalRequestedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await olderCreatedNewerRequested.updateOne({ $set: { createdAt: new Date("2026-01-01T00:00:00.000Z") } });
    await newerCreatedOlderRequested.updateOne({ $set: { createdAt: new Date("2026-01-02T00:00:00.000Z") } });

    const ids = await getApprovalIds("/api/v1/web/approvals/associates");

    expect(ids.slice(0, 2)).toEqual([
      String(olderCreatedNewerRequested._id),
      String(newerCreatedOlderRequested._id),
    ]);
  });

  it("lists pending operators by newest approval request first", async () => {
    const olderCreatedNewerRequested = await createOperator({
      name: "Older Created Newer Requested",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      approvalRequestedAt: new Date("2026-02-03T00:00:00.000Z"),
    });
    const newerCreatedOlderRequested = await createOperator({
      name: "Newer Created Older Requested",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      approvalRequestedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    await olderCreatedNewerRequested.updateOne({ $set: { createdAt: new Date("2026-02-01T00:00:00.000Z") } });
    await newerCreatedOlderRequested.updateOne({ $set: { createdAt: new Date("2026-02-02T00:00:00.000Z") } });

    const ids = await getApprovalIds("/api/v1/web/approvals/operators");

    expect(ids.slice(0, 2)).toEqual([
      String(olderCreatedNewerRequested._id),
      String(newerCreatedOlderRequested._id),
    ]);
  });

  it("lists pending companies by newest creation first", async () => {
    const olderSupervisor = await createAssociate({ registrationStatus: "PENDING_REVIEW", onboardingComplete: true });
    const newerSupervisor = await createAssociate({ registrationStatus: "PENDING_REVIEW", onboardingComplete: true });
    const olderCompany = await AssociateCompanyModel.create({
      name: "Older Company",
      email: "older.company@example.com",
      phone: "+919999000003",
      phoneSecondary: "+919999000004",
      registrationStatus: "PENDING_REVIEW",
      isApproved: false,
      supervisor: olderSupervisor._id,
    });
    const newerCompany = await AssociateCompanyModel.create({
      name: "Newer Company",
      email: "newer.company@example.com",
      phone: "+919999000005",
      phoneSecondary: "+919999000006",
      registrationStatus: "PENDING_REVIEW",
      isApproved: false,
      supervisor: newerSupervisor._id,
    });

    await olderCompany.updateOne({ $set: { createdAt: new Date("2026-03-01T00:00:00.000Z") } });
    await newerCompany.updateOne({ $set: { createdAt: new Date("2026-03-02T00:00:00.000Z") } });

    const ids = await getApprovalIds("/api/v1/web/approvals/companies");

    expect(ids.slice(0, 2)).toEqual([
      String(newerCompany._id),
      String(olderCompany._id),
    ]);
  });
});
