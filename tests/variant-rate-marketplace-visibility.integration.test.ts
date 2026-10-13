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
import { createAssociate } from "./helpers/authFixtures";
import { expireStaleVariantRates, LISTING_FRESHNESS_MS } from "../src/services/variantRateFreshnessService";

const api = request(app);

const authCookie = (associate: any) => {
  const token = jwt.sign(
    { id: String(associate._id), email: associate.email, role: "Associate" },
    process.env.JWT_SECRET as string,
  );
  return `auth_token=${token}`;
};

const createCompany = (name: string) => AssociateCompanyModel.create({
  name,
  email: `${new mongoose.Types.ObjectId()}@example.com`,
  phone: "+919800000021",
  phoneSecondary: "+919800000022",
  address: `${name} office`,
});

describe("variant-rate marketplace visibility", () => {
  it("shows every eligible live listing while protecting foreign prices", async () => {
    const [companyA, companyB] = await Promise.all([
      createCompany("Marketplace Company A"),
      createCompany("Marketplace Company B"),
    ]);
    const [viewer, teammate, external] = await Promise.all([
      createAssociate({ associateCompany: companyA._id }),
      createAssociate({ associateCompany: companyA._id }),
      createAssociate({ associateCompany: companyB._id }),
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
    const freshDate = new Date(now.getTime() - 60_000);
    const staleDate = new Date(now.getTime() - LISTING_FRESHNESS_MS - 1);
    const makeRate = (associate: any, company: any, rate: number, overrides: Record<string, any> = {}) => ({
      productVariant: variant._id,
      associate: associate._id,
      associateCompany: company._id,
      rate,
      commission: 2.5,
      isLive: true,
      isDeleted: false,
      lastLiveAt: freshDate,
      lastLiveDate: freshDate,
      createdAt: freshDate,
      updatedAt: freshDate,
      ...overrides,
    });

    const inserted = await VariantRateModel.collection.insertMany([
      makeRate(viewer, companyA, 100),
      makeRate(teammate, companyA, 110),
      makeRate(external, companyB, 120),
      makeRate(external, companyB, 130, { isLive: false, unpublishedAt: freshDate }),
      makeRate(external, companyB, 140, { isDeleted: true }),
      makeRate(external, companyB, 150, { lastLiveAt: staleDate, lastLiveDate: staleDate, createdAt: staleDate, updatedAt: staleDate }),
    ] as any);

    await expect(expireStaleVariantRates(now)).resolves.toBe(1);

    const response = await api
      .get("/api/v1/web/variant-rates")
      .set("Cookie", authCookie(viewer))
      .query({ view: "marketplace", isLive: true, limit: 50 });

    expect(response.status).toBe(200);
    const rows = response.body?.data?.data || [];
    expect(rows).toHaveLength(3);
    expect(rows.map((row: any) => String(row._id))).toEqual(expect.arrayContaining([
      String(inserted.insertedIds[0]),
      String(inserted.insertedIds[1]),
      String(inserted.insertedIds[2]),
    ]));

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
  });
});
