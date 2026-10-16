import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { CategoryModel } from "../src/database/models/category";
import { createAssociate } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";

const api = request(app);
const tokenFor = (user: any, role: string) => generateJWTToken({ _id: user._id, email: user.email, role } as any, "1h");

describe("catalog moderation", () => {
  it("keeps proposals private, exposes approved nodes, and applies approved revisions", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    const company = await AssociateCompanyModel.create({
      name: `Moderation Co ${suffix}`, email: `mod-${suffix}@example.com`, phone: "+919811110001",
      phoneSecondary: "+919811110011",
      address: "Moderation office", registrationStatus: "APPROVED", isApproved: true,
    });
    const otherCompany = await AssociateCompanyModel.create({
      name: `Other Co ${suffix}`, email: `other-${suffix}@example.com`, phone: "+919811110002",
      phoneSecondary: "+919811110012",
      address: "Other office", registrationStatus: "APPROVED", isApproved: true,
    });
    const creator = await createAssociate({ associateCompany: company._id, isCompanyVerified: true });
    const other = await createAssociate({ associateCompany: otherCompany._id, isCompanyVerified: true });
    const creatorToken = tokenFor(creator, "Associate");
    const otherToken = tokenFor(other, "Associate");
    const adminToken = tokenFor({ _id: new mongoose.Types.ObjectId(), email: "catalog-admin@example.com" }, "Admin");

    await api.post("/api/v1/web/catalog-moderation/variantRate")
      .set("Authorization", `Bearer ${creatorToken}`).send({ rate: 100 }).expect(400);
    await api.get("/api/v1/web/approvals/catalog/variantRate")
      .set("Authorization", `Bearer ${adminToken}`).expect(400);

    const created = await api.post("/api/v1/web/catalog-moderation/category")
      .set("Authorization", `Bearer ${creatorToken}`).send({ name: `Private Category ${suffix}`, description: "Private draft" });
    expect(created.status).toBe(201);
    expect(created.body.data.approvalStatus).toBe("DRAFT");
    const categoryId = String(created.body.data._id);

    const revisionSubmit = await api.post(`/api/v1/web/catalog-moderation/category/${categoryId}/submit`)
      .set("Authorization", `Bearer ${creatorToken}`);
    expect(revisionSubmit.status, JSON.stringify(revisionSubmit.body)).toBe(200);

    const creatorOptions = await api.get("/api/v1/web/catalog/hierarchy-options").set("Authorization", `Bearer ${creatorToken}`);
    const otherOptions = await api.get("/api/v1/web/catalog/hierarchy-options").set("Authorization", `Bearer ${otherToken}`);
    expect(creatorOptions.body.data.map((row: any) => String(row.id))).toContain(categoryId);
    expect(otherOptions.body.data.map((row: any) => String(row.id))).not.toContain(categoryId);

    const queue = await api.get("/api/v1/web/approvals/catalog/category").set("Authorization", `Bearer ${adminToken}`);
    expect(queue.body.data.map((row: any) => String(row._id))).toContain(categoryId);
    await api.patch(`/api/v1/web/approvals/catalog/category/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`).send({ action: "APPROVE" }).expect(200);

    const approvedOptions = await api.get("/api/v1/web/catalog/hierarchy-options").set("Authorization", `Bearer ${otherToken}`);
    expect(approvedOptions.body.data.map((row: any) => String(row.id))).toContain(categoryId);

    const revisedName = `Revised Category ${suffix}`;
    const revisionDraft = await api.patch(`/api/v1/web/catalog-moderation/category/${categoryId}`)
      .set("Authorization", `Bearer ${creatorToken}`).send({ name: revisedName });
    expect(revisionDraft.status).toBe(200);
    expect(revisionDraft.body.data.entityType).toBe("category");
    expect((await CategoryModel.findById(categoryId).lean())?.name).not.toBe(revisedName);

    const submittedRevision = await api.post(`/api/v1/web/catalog-moderation/category/${categoryId}/submit`)
      .set("Authorization", `Bearer ${creatorToken}`);
    expect(submittedRevision.status, JSON.stringify(submittedRevision.body)).toBe(200);
    const revisionQueue = await api.get("/api/v1/web/approvals/catalog/category").set("Authorization", `Bearer ${adminToken}`);
    const revision = revisionQueue.body.data.find((row: any) => row.sourceKind === "REVISION");
    expect(revision).toBeTruthy();
    await api.patch(`/api/v1/web/approvals/catalog/category/${revision._id}`)
      .set("Authorization", `Bearer ${adminToken}`).send({ action: "APPROVE" }).expect(200);
    expect((await CategoryModel.findById(categoryId).lean())?.name).toBe(revisedName);
  });
});
