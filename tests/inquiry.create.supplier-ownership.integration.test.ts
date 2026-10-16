import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import { CategoryModel } from "../src/database/models/category";
import { SubCategoryModel } from "../src/database/models/subCategory";
import { ProductModel } from "../src/database/models/product";
import { ProductVariantModel } from "../src/database/models/productVariant";
import { VariantRateModel } from "../src/database/models/variantRate";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { createAssociate, createOperator } from "./helpers/authFixtures";

const api = request(app);

const authCookie = (role = "Operator") => {
  const token = jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toHexString(),
      email: "operator.test@example.com",
      role,
    },
    process.env.JWT_SECRET as string
  );
  return `auth_token=${token}`;
};

const createProductFixture = async () => {
  const category = await CategoryModel.create({
    name: `Category ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
    description: "Test category",
    inventoryManager: new mongoose.Types.ObjectId(),
  });

  const subCategory = await SubCategoryModel.create({
    name: `SubCategory ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
    description: "Test sub category",
    category: category._id,
  });

  const product = await ProductModel.create({
    name: `Product ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
    description: "Test product",
    subCategory: subCategory._id,
  });

  return product;
};

const createCompany = (overrides: Record<string, any> = {}) =>
  AssociateCompanyModel.create({
    name: `Company ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
    email: `company.${new mongoose.Types.ObjectId().toHexString()}@example.com`,
    phone: "+919800000001",
    phoneSecondary: "+919800000002",
    ...overrides,
  });

describe("Inquiry create supplier ownership rule", () => {
  it("creates inquiry and sets supplier operator when company has assigned operator", async () => {
    const product = await createProductFixture();
    const assignedOperator = await createOperator();

    const buyerCompany = await createCompany();
    const sellerCompany = await createCompany({ assignedOperator: assignedOperator._id });
    const buyerAssociate = await createAssociate({ associateCompany: buyerCompany._id });
    const sellerAssociate = await createAssociate({ associateCompany: sellerCompany._id });

    const res = await api
      .post("/api/v1/web/inquiries")
      .set("Cookie", authCookie("Operator"))
      .send({
        productId: product._id,
        buyerAssociateId: buyerAssociate._id,
        sellerAssociateId: sellerAssociate._id,
        quantity: 5,
      });

    expect(res.status).toBe(201);
    expect(String(res.body?.data?.supplierOperatorId?._id || res.body?.data?.supplierOperatorId || "")).toBe(
      String(assignedOperator._id)
    );
  });

  it("allows create when company has associates but supplier operator is missing", async () => {
    const product = await createProductFixture();

    const buyerCompany = await createCompany();
    const sellerCompany = await createCompany();
    const buyerAssociate = await createAssociate({ associateCompany: buyerCompany._id });
    const sellerAssociate = await createAssociate({ associateCompany: sellerCompany._id });

    const res = await api
      .post("/api/v1/web/inquiries")
      .set("Cookie", authCookie("Operator"))
      .send({
        productId: product._id,
        buyerAssociateId: buyerAssociate._id,
        sellerAssociateId: sellerAssociate._id,
        quantity: 5,
      });

    expect(res.status).toBe(201);
    const supplierOperator = res.body?.data?.supplierOperatorId;
    expect(supplierOperator === null || supplierOperator === undefined || supplierOperator === "").toBe(true);
  });

  it("allows create with null supplier operator when company has no active associates", async () => {
    const product = await createProductFixture();

    const buyerCompany = await createCompany();
    const sellerCompany = await createCompany();
    const buyerAssociate = await createAssociate({ associateCompany: buyerCompany._id });
    const sellerAssociate = await createAssociate({
      associateCompany: sellerCompany._id,
      isActive: false,
      isDeleted: false,
    });

    const res = await api
      .post("/api/v1/web/inquiries")
      .set("Cookie", authCookie("Operator"))
      .send({
        productId: product._id,
        buyerAssociateId: buyerAssociate._id,
        sellerAssociateId: sellerAssociate._id,
        quantity: 5,
      });

    expect(res.status).toBe(201);
    const supplierOperator = res.body?.data?.supplierOperatorId;
    expect(supplierOperator === null || supplierOperator === undefined || supplierOperator === "").toBe(true);
  });

  it("creates an enquiry from an eligible live marketplace listing", async () => {
    const product = await createProductFixture();
    const variant = await ProductVariantModel.create({
      name: `Variant ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
      description: "Eligible marketplace listing fixture",
      product: product._id,
      approvalStatus: "APPROVED",
    });
    const buyerCompany = await createCompany({ registrationStatus: "APPROVED", isApproved: true });
    const sellerCompany = await createCompany({ registrationStatus: "APPROVED", isApproved: true });
    const buyerAssociate = await createAssociate({ associateCompany: buyerCompany._id, isCompanyVerified: true });
    const sellerAssociate = await createAssociate({ associateCompany: sellerCompany._id, isCompanyVerified: true });
    const listing = await VariantRateModel.create({
      productVariant: variant._id,
      associate: sellerAssociate._id,
      associateCompany: sellerCompany._id,
      rate: 250,
      isLive: true,
      approvalStatus: "APPROVED",
      lastLiveDate: new Date(),
    });

    const res = await api
      .post("/api/v1/web/inquiries")
      .set("Cookie", authCookie("Operator"))
      .send({
        productId: product._id,
        buyerAssociateId: buyerAssociate._id,
        sellerAssociateId: sellerAssociate._id,
        variantRateId: listing._id,
        quantity: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body?.success).toBe(true);
    expect(String(res.body?.data?.variantRateId?._id || res.body?.data?.variantRateId)).toBe(String(listing._id));
  });

  it("returns a structured eligibility conflict when listing ownership is no longer approved", async () => {
    const product = await createProductFixture();
    const variant = await ProductVariantModel.create({
      name: `Variant ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
      description: "Ineligible marketplace listing fixture",
      product: product._id,
      approvalStatus: "APPROVED",
    });
    const buyerCompany = await createCompany({ registrationStatus: "APPROVED", isApproved: true });
    const sellerCompany = await createCompany({ registrationStatus: "APPROVED", isApproved: true });
    const buyerAssociate = await createAssociate({ associateCompany: buyerCompany._id, isCompanyVerified: true });
    const sellerAssociate = await createAssociate({
      associateCompany: sellerCompany._id,
      isCompanyVerified: false,
      registrationStatus: "PENDING_REVIEW",
    });
    const listing = await VariantRateModel.create({
      productVariant: variant._id,
      associate: sellerAssociate._id,
      associateCompany: sellerCompany._id,
      rate: 250,
      isLive: true,
      approvalStatus: "APPROVED",
      lastLiveDate: new Date(),
    });

    const res = await api
      .post("/api/v1/web/inquiries")
      .set("Cookie", authCookie("Operator"))
      .set("Accept", "application/json")
      .send({
        productId: product._id,
        buyerAssociateId: buyerAssociate._id,
        sellerAssociateId: sellerAssociate._id,
        variantRateId: listing._id,
        quantity: 5,
      });

    expect(res.status).toBe(409);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body).toMatchObject({
      success: false,
      status: 409,
      code: "LISTING_NOT_ENQUIRY_ELIGIBLE",
      message: "This product is no longer available for enquiry. Please refresh the marketplace.",
    });
  });
});
