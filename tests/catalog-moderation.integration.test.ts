import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { CategoryModel } from "../src/database/models/category";
import { CatalogRevisionModel } from "../src/database/models/catalogRevision";
import { ProductModel } from "../src/database/models/product";
import { ProductVariantModel } from "../src/database/models/productVariant";
import { SubCategoryModel } from "../src/database/models/subCategory";
import { VariantRateModel } from "../src/database/models/variantRate";
import { createAssociate } from "./helpers/authFixtures";
import { generateJWTToken } from "../src/utils/tokenUtils";

const api = request(app);
const tokenFor = (user: any, role: string) => generateJWTToken({ _id: user._id, email: user.email, role } as any, "1h");

describe("catalog moderation", () => {
  it("returns every non-deleted requested rate for variant entities and revisions newest first", async () => {
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
    const company = await AssociateCompanyModel.create({
      name: `Rate Review Co ${suffix}`, email: `rate-review-${suffix}@example.com`, phone: "+919811110021",
      phoneSecondary: "+919811110022", address: "Rate review office", registrationStatus: "APPROVED", isApproved: true,
    });
    const associate = await createAssociate({ associateCompany: company._id, isCompanyVerified: true });
    const adminToken = tokenFor({ _id: new mongoose.Types.ObjectId(), email: "rate-review-admin@example.com" }, "Admin");
    const category = await CategoryModel.create({ name: `Rate Category ${suffix}`, approvalStatus: "APPROVED" });
    const subCategory = await SubCategoryModel.create({ name: `Rate Subcategory ${suffix}`, category: category._id, approvalStatus: "APPROVED" });
    const product = await ProductModel.create({ name: `Rate Product ${suffix}`, description: "Rate product", subCategory: subCategory._id, approvalStatus: "APPROVED" });
    const pendingVariant = await ProductVariantModel.create({
      name: `Pending Rate Variant ${suffix}`, description: "Pending variant", product: product._id,
      approvalStatus: "PENDING_REVIEW", createdByAssociate: associate._id, createdByCompany: company._id,
    });
    const approvedVariant = await ProductVariantModel.create({
      name: `Revision Rate Variant ${suffix}`, description: "Approved variant", product: product._id,
      approvalStatus: "APPROVED", createdByAssociate: associate._id, createdByCompany: company._id,
    });
    const older = new Date("2026-01-01T00:00:00.000Z");
    const newer = new Date("2026-02-01T00:00:00.000Z");
    await VariantRateModel.collection.insertMany([
      { rate: 100, unit: "KG", productVariant: pendingVariant._id, associate: associate._id, associateCompany: company._id, isDeleted: false, createdAt: older, updatedAt: older },
      { rate: 250, unit: "Quintal", productVariant: pendingVariant._id, associate: associate._id, associateCompany: company._id, isDeleted: false, createdAt: newer, updatedAt: newer },
      { rate: 999, unit: "MT", productVariant: pendingVariant._id, associate: associate._id, associateCompany: company._id, isDeleted: true, createdAt: newer, updatedAt: newer },
      { rate: 300, unit: "MT", productVariant: approvedVariant._id, associate: associate._id, associateCompany: company._id, isDeleted: false, createdAt: newer, updatedAt: newer },
    ] as any);
    await CatalogRevisionModel.create({
      entityType: "productVariant", entityId: approvedVariant._id, proposedChanges: { description: "Revised description" },
      status: "PENDING_REVIEW", createdByAssociate: associate._id, createdByCompany: company._id,
      approvalRequestedAt: newer, baseUpdatedAt: approvedVariant.updatedAt,
    });

    const response = await api.get("/api/v1/web/approvals/catalog/productVariant")
      .set("Authorization", `Bearer ${adminToken}`).expect(200);
    const entity = response.body.data.find((row: any) => String(row._id) === String(pendingVariant._id));
    expect(entity.requestedRates.map((row: any) => ({ rate: row.rate, unit: row.unit }))).toEqual([
      { rate: 250, unit: "Quintal" },
      { rate: 100, unit: "KG" },
    ]);
    expect(entity.listingCount).toBe(2);
    const revision = response.body.data.find((row: any) => row.sourceKind === "REVISION" && String(row.entityId) === String(approvedVariant._id));
    expect(revision.requestedRates).toEqual([expect.objectContaining({ rate: 300, unit: "MT" })]);

    const categoryResponse = await api.get("/api/v1/web/approvals/catalog/category")
      .query({ status: "APPROVED" }).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const returnedCategory = categoryResponse.body.data.find((row: any) => String(row._id) === String(category._id));
    expect(returnedCategory).not.toHaveProperty("requestedRates");
  });

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
