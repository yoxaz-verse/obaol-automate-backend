import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { CategoryModel } from "../src/database/models/category";
import { SubCategoryModel } from "../src/database/models/subCategory";
import { ProductModel } from "../src/database/models/product";
import { ProductVariantModel } from "../src/database/models/productVariant";
import { VariantRateModel } from "../src/database/models/variantRate";
import { createAdmin, createAssociate, createOperator } from "./helpers/authFixtures";
import { expireStaleVariantRates, LISTING_LIVE_DURATION_MS, liveFreshnessCondition } from "../src/services/variantRateFreshnessService";

const api = request(app);

const authCookie = (associate: any) => {
  const token = jwt.sign(
    { id: String(associate._id), email: associate.email, role: "Associate" },
    process.env.JWT_SECRET as string,
  );
  return `auth_token=${token}`;
};

const adminAuthCookie = (admin: any) => {
  const token = jwt.sign(
    { id: String(admin._id), email: admin.email, role: "Admin" },
    process.env.JWT_SECRET as string,
  );
  return `auth_token=${token}`;
};

const operatorAuthCookie = (operator: any) => {
  const token = jwt.sign(
    { id: String(operator._id), email: operator.email, role: "Operator" },
    process.env.JWT_SECRET as string,
  );
  return `auth_token=${token}`;
};

const createCompany = (name: string, overrides: Record<string, any> = {}) => AssociateCompanyModel.create({
  name,
  email: `${new mongoose.Types.ObjectId()}@example.com`,
  phone: "+919800000021",
  phoneSecondary: "+919800000022",
  address: `${name} office`,
  registrationStatus: "APPROVED",
  isApproved: true,
  ...overrides,
});

describe("variant-rate marketplace visibility", () => {
  it("returns past listings newest-first across pages with a stable created-at tie-breaker", async () => {
    const [admin, company] = await Promise.all([
      createAdmin(),
      createCompany("Past Listing Sort Company"),
    ]);
    const owner = await createAssociate({ associateCompany: company._id, isCompanyVerified: true });
    const category = await CategoryModel.create({
      name: "Past Listing Sort Category",
      inventoryManager: new mongoose.Types.ObjectId(),
    });
    const subCategory = await SubCategoryModel.create({
      name: "Past Listing Sort Subcategory",
      category: category._id,
    });
    const product = await ProductModel.create({
      name: "Past Listing Sort Product",
      description: "Past listing ordering fixture",
      subCategory: subCategory._id,
    });
    const variant = await ProductVariantModel.create({
      name: "Past Listing Sort Variant",
      description: "Past listing ordering fixture",
      product: product._id,
    });

    const newestDate = new Date("2026-10-15T12:00:00.000Z");
    const middleDate = new Date("2026-10-14T12:00:00.000Z");
    const oldestDate = new Date("2026-10-13T12:00:00.000Z");
    const inserted = await VariantRateModel.collection.insertMany([
      { productVariant: variant._id, associate: owner._id, associateCompany: company._id, rate: 100, isLive: false, isDeleted: false, lastLiveDate: oldestDate, createdAt: oldestDate, updatedAt: oldestDate },
      { productVariant: variant._id, associate: owner._id, associateCompany: company._id, rate: 110, isLive: false, isDeleted: false, lastLiveDate: middleDate, createdAt: new Date("2026-10-14T10:00:00.000Z"), updatedAt: middleDate },
      { productVariant: variant._id, associate: owner._id, associateCompany: company._id, rate: 120, isLive: false, isDeleted: false, lastLiveDate: newestDate, createdAt: newestDate, updatedAt: newestDate },
      { productVariant: variant._id, associate: owner._id, associateCompany: company._id, rate: 130, isLive: false, isDeleted: false, lastLiveDate: middleDate, createdAt: new Date("2026-10-14T11:00:00.000Z"), updatedAt: middleDate },
    ] as any);

    const fetchPage = async (page: number) => {
      const response = await api
        .get("/api/v1/web/variant-rates")
        .set("Cookie", adminAuthCookie(admin))
        .query({ view: "marketplace", isLive: false, sort: "lastLiveDate:desc", page, limit: 2 });
      expect(response.status).toBe(200);
      return (response.body?.data?.data || []).map((row: any) => String(row._id));
    };

    await expect(Promise.all([fetchPage(1), fetchPage(2)]))
      .resolves.toEqual([
        [String(inserted.insertedIds[2]), String(inserted.insertedIds[3])],
        [String(inserted.insertedIds[1]), String(inserted.insertedIds[0])],
      ]);
  });

  it("shows every live listing while protecting foreign prices", async () => {
    const operator = await createOperator();
    const [companyA, companyB, operatorManagedCompany] = await Promise.all([
      createCompany("Marketplace Company A"),
      createCompany("Marketplace Company B"),
      createCompany("Operator Managed Marketplace Company", { assignedOperator: operator._id }),
    ]);
    const [viewer, teammate, external, operatorManagedOwner] = await Promise.all([
      createAssociate({ associateCompany: companyA._id, isCompanyVerified: true }),
      createAssociate({ associateCompany: companyA._id, isCompanyVerified: true }),
      createAssociate({ associateCompany: companyB._id, isCompanyVerified: true }),
      createAssociate({ associateCompany: operatorManagedCompany._id, isCompanyVerified: true }),
    ]);

    const category = await CategoryModel.create({
      name: "Marketplace Category",
      inventoryManager: new mongoose.Types.ObjectId(),
    });
    const subCategory = await SubCategoryModel.create({
      name: "Marketplace Subcategory",
      category: category._id,
    });
    const product = await ProductModel.create({
      name: "Marketplace Product",
      description: "Marketplace visibility fixture",
      subCategory: subCategory._id,
    });
    const variant = await ProductVariantModel.create({
      name: "Marketplace Variant",
      description: "Marketplace visibility fixture",
      product: product._id,
    });

    const now = new Date();
    const newestDate = new Date(now.getTime() - 30_000);
    const middleDate = new Date(now.getTime() - 60_000);
    const oldestDate = new Date(now.getTime() - 90_000);
    const staleDate = new Date(now.getTime() - LISTING_LIVE_DURATION_MS - 1);
    const makeRate = (associate: any, company: any, rate: number, overrides: Record<string, any> = {}) => ({
      productVariant: variant._id,
      associate: associate._id,
      associateCompany: company._id,
      rate,
      commission: 2.5,
      isLive: true,
      isDeleted: false,
      lastLiveAt: middleDate,
      lastLiveDate: middleDate,
      createdAt: middleDate,
      updatedAt: middleDate,
      officeAddress: "Protected supplier address",
      ...overrides,
    });

    const inserted = await VariantRateModel.collection.insertMany([
      makeRate(viewer, companyA, 100, { lastLiveAt: oldestDate, lastLiveDate: oldestDate, createdAt: oldestDate, updatedAt: oldestDate }),
      makeRate(teammate, companyA, 110, { createdAt: new Date(middleDate.getTime() - 1_000) }),
      makeRate(external, companyB, 120),
      makeRate(operatorManagedOwner, operatorManagedCompany, 125, { lastLiveAt: newestDate, lastLiveDate: newestDate, createdAt: newestDate, updatedAt: newestDate }),
      makeRate(external, companyB, 130, { isLive: false, unpublishedAt: middleDate }),
      makeRate(external, companyB, 140, { isDeleted: true }),
      makeRate(external, companyB, 150, { lastLiveAt: staleDate, lastLiveDate: staleDate, createdAt: staleDate, updatedAt: staleDate }),
    ] as any);

    await expect(expireStaleVariantRates(now)).resolves.toBe(1);
    await expect(VariantRateModel.countDocuments({
      $and: [{ isLive: true }, liveFreshnessCondition(now)],
      isDeleted: { $ne: true },
    })).resolves.toBe(4);

    const response = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", authCookie(viewer))
      .query({ view: "marketplace", isLive: true, sort: "lastLiveDate:desc", limit: 50 });

    expect(response.status).toBe(200);
    const rows = response.body?.data?.data || [];
    const expectedLiveIds = [3, 2, 1, 0].map((index) => String(inserted.insertedIds[index]));
    expect(rows).toHaveLength(4);
    expect(rows.map((row: any) => String(row._id))).toEqual(expectedLiveIds);

    const operatorResponse = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", operatorAuthCookie(operator))
      .query({ view: "marketplace", isLive: true, sort: "lastLiveDate:desc", limit: 50 });
    expect(operatorResponse.status).toBe(200);
    expect((operatorResponse.body?.data?.data || []).map((row: any) => String(row._id)))
      .toEqual(expectedLiveIds);

    const ownRow = rows.find((row: any) => String(row._id) === String(inserted.insertedIds[0]));
    const teammateRow = rows.find((row: any) => String(row._id) === String(inserted.insertedIds[1]));
    const externalRow = rows.find((row: any) => String(row._id) === String(inserted.insertedIds[2]));
    expect(ownRow).toMatchObject({ rate: 100, commission: 2.5, isOwnedByViewer: true });
    expect(teammateRow).toMatchObject({ isOwnedByViewer: false });
    expect(externalRow).toMatchObject({ isOwnedByViewer: false });
    expect(teammateRow).not.toHaveProperty("rate");
    expect(teammateRow).not.toHaveProperty("commission");
    expect(externalRow).not.toHaveProperty("rate");
    expect(externalRow).not.toHaveProperty("commission");
    expect(externalRow).not.toHaveProperty("officeAddress");
  });

  it("returns the same live listing ids to admins and associates regardless of moderation metadata", async () => {
    const [admin, company] = await Promise.all([
      createAdmin(),
      createCompany("Shared Marketplace Company"),
    ]);
    const [viewer, owner] = await Promise.all([
      createAssociate({ associateCompany: company._id, isCompanyVerified: true }),
      createAssociate({
      associateCompany: company._id,
        isCompanyVerified: false,
        registrationStatus: "PENDING_REVIEW",
      }),
    ]);
    const pendingCategory = await CategoryModel.create({
      name: "Pending Marketplace Category",
      inventoryManager: new mongoose.Types.ObjectId(),
      approvalStatus: "PENDING_REVIEW",
    });
    const subCategory = await SubCategoryModel.create({
      name: "Blocked Marketplace Subcategory",
      category: pendingCategory._id,
      approvalStatus: "APPROVED",
    });
    const product = await ProductModel.create({
      name: "Blocked Marketplace Product",
      description: "Blocked marketplace fixture",
      subCategory: subCategory._id,
      approvalStatus: "APPROVED",
    });
    const variant = await ProductVariantModel.create({
      name: "Blocked Marketplace Variant",
      description: "Blocked marketplace fixture",
      product: product._id,
      approvalStatus: "APPROVED",
    });
    const now = new Date();
    const [liveListing, offlineListing, deletedListing] = await Promise.all([
      VariantRateModel.create({
        productVariant: variant._id, associate: owner._id, associateCompany: company._id,
        rate: 200, isLive: true, approvalStatus: "PENDING_REVIEW", lastLiveAt: now, lastLiveDate: now,
      }),
      VariantRateModel.create({
        productVariant: variant._id, associate: owner._id, associateCompany: company._id,
        rate: 210, isLive: false, approvalStatus: "PENDING_REVIEW", unpublishedAt: now,
      }),
      VariantRateModel.create({
        productVariant: variant._id, associate: owner._id, associateCompany: company._id,
        rate: 220, isLive: true, isDeleted: true, approvalStatus: "PENDING_REVIEW", lastLiveAt: now, lastLiveDate: now,
      }),
    ]);

    const adminRowsResponse = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", adminAuthCookie(admin))
      .query({ view: "marketplace", isLive: true, limit: 50 });
    expect(adminRowsResponse.status).toBe(200);

    const associateRowsResponse = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", authCookie(viewer))
      .query({ view: "marketplace", isLive: true, limit: 50 });
    expect(associateRowsResponse.status).toBe(200);
    const adminRows = adminRowsResponse.body?.data?.data || [];
    const associateRows = associateRowsResponse.body?.data?.data || [];
    expect(associateRows.map((row: any) => String(row._id)).sort()).toEqual(
      adminRows.map((row: any) => String(row._id)).sort(),
    );
    expect(associateRows.map((row: any) => String(row._id))).toContain(String(liveListing._id));
    expect(associateRows.map((row: any) => String(row._id))).not.toContain(String(offlineListing._id));
    expect(associateRows.map((row: any) => String(row._id))).not.toContain(String(deletedListing._id));
    const foreignRow = associateRows.find((row: any) => String(row._id) === String(liveListing._id));
    expect(foreignRow).not.toHaveProperty("rate");
    expect(foreignRow).not.toHaveProperty("commission");

    const statsResponse = await api
      .get("/api/v1/web/variant-rates/marketplace-stats")
      .set("Cookie", adminAuthCookie(admin));
    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body?.data?.live).toBe(adminRows.length);

    const publishResponse = await api
      .patch(`/api/v1/web/variant-rates/${offlineListing._id}`)
      .set("Cookie", adminAuthCookie(admin))
      .send({ isLive: true });
    expect(publishResponse.status).toBe(200);
    const refreshedAssociateResponse = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", authCookie(viewer))
      .query({ view: "marketplace", isLive: true, limit: 50 });
    expect((refreshedAssociateResponse.body?.data?.data || []).map((row: any) => String(row._id)))
      .toContain(String(offlineListing._id));
  });
});
