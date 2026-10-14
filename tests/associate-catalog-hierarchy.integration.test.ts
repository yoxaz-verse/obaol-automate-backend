import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import { CategoryModel } from "../src/database/models/category";
import { SubCategoryModel } from "../src/database/models/subCategory";
import { ProductModel } from "../src/database/models/product";
import { ProductVariantModel } from "../src/database/models/productVariant";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { createAssociate } from "./helpers/authFixtures";

const api = request(app);

const authCookie = (user: any, role = "Associate") => {
  const token = jwt.sign(
    { id: String(user._id), email: user.email, role },
    process.env.JWT_SECRET as string,
  );
  return `auth_token=${token}`;
};

const rows = (response: any) => Array.isArray(response.body?.data) ? response.body.data : response.body?.data?.data || [];

describe("associate catalog hierarchy", () => {
  it("allows associates to read the full hierarchy and applies exact parent filters", async () => {
    const inventoryManager = new mongoose.Types.ObjectId();
    const suffix = new mongoose.Types.ObjectId().toHexString().slice(0, 8);
    const company = await AssociateCompanyModel.create({
      name: `Associate Catalog Company ${suffix}`,
      email: `associate.catalog.${suffix}@example.com`,
      phone: "+919800000011",
      phoneSecondary: "+919800000012",
      address: "Associate catalog office",
      registrationStatus: "APPROVED",
      isApproved: true,
    });
    const associate = await createAssociate({ associateCompany: company._id, isCompanyVerified: true });

    const [categoryA, categoryB] = await CategoryModel.create([
      { name: `  AgRi ${suffix}  `, inventoryManager },
      { name: `Associate Category B ${suffix}`, inventoryManager },
    ]);
    const [subA, subB] = await SubCategoryModel.create([
      { name: `Associate Subcategory A ${suffix}`, category: categoryA._id },
      { name: `Associate Subcategory B ${suffix}`, category: categoryB._id },
    ]);
    const [productA, productB] = await ProductModel.create([
      { name: `Associate Product A ${suffix}`, description: "A", subCategory: subA._id },
      { name: `Associate Product B ${suffix}`, description: "B", subCategory: subB._id },
    ]);
    const [variantA, variantB] = await ProductVariantModel.create([
      { name: `Associate Variant A ${suffix}`, description: "A", product: productA._id },
      { name: `Associate Variant B ${suffix}`, description: "B", product: productB._id },
    ]);

    const cookie = authCookie(associate);
    const categoriesResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie);
    const subcategoriesResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ category: String(categoryA._id) });
    const productsResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ subCategory: String(subA._id) });
    const variantsResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ product: String(productA._id) });

    expect(categoriesResponse.status).toBe(200);
    expect(rows(categoriesResponse).map((row: any) => String(row.id))).toEqual(expect.arrayContaining([String(categoryA._id), String(categoryB._id)]));

    expect(subcategoriesResponse.status).toBe(200);
    expect(rows(subcategoriesResponse).map((row: any) => String(row.id))).toContain(String(subA._id));
    expect(rows(subcategoriesResponse).map((row: any) => String(row.id))).not.toContain(String(subB._id));
    expect(rows(subcategoriesResponse).find((row: any) => String(row.id) === String(subA._id))).toMatchObject({
      level: "subCategory",
      parentId: String(categoryA._id),
      parentName: `AgRi ${suffix}`,
    });

    expect(productsResponse.status).toBe(200);
    expect(rows(productsResponse).map((row: any) => String(row.id))).toContain(String(productA._id));
    expect(rows(productsResponse).map((row: any) => String(row.id))).not.toContain(String(productB._id));

    expect(variantsResponse.status).toBe(200);
    expect(rows(variantsResponse).map((row: any) => String(row.id))).toContain(String(variantA._id));
    expect(rows(variantsResponse).map((row: any) => String(row.id))).not.toContain(String(variantB._id));

    const createRateResponse = await api
      .post("/api/v1/web/variant-rates")
      .set("Cookie", cookie)
      .send({
        rate: 125,
        unit: "KG",
        productVariant: variantA._id,
        locationSource: "OFFICE_ADDRESS",
        officeAddress: "Associate catalog office",
        isLive: false,
        isConventional: true,
        isNatural: false,
        isOrganic: false,
        isIpmQuality: false,
      });

    expect(createRateResponse.status).toBe(201);
    expect(String(createRateResponse.body?.data?.associate)).toBe(String(associate._id));
    expect(String(createRateResponse.body?.data?.associateCompany)).toBe(String(company._id));
    expect(String(createRateResponse.body?.data?.productVariant)).toBe(String(variantA._id));
    expect(createRateResponse.body?.data?.approvalStatus).toBe("PENDING_REVIEW");

    const invalidResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ category: "not-an-id" });
    expect(invalidResponse.status).toBe(400);

    const missingResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ category: String(new mongoose.Types.ObjectId()) });
    expect(missingResponse.status).toBe(404);

    const conflictingResponse = await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie).query({ category: String(categoryA._id), product: String(productA._id) });
    expect(conflictingResponse.status).toBe(400);

    for (const role of ["Admin", "Operator"]) {
      const roleResponse = await api
        .get("/api/v1/web/catalog/hierarchy-options")
        .set("Cookie", authCookie({ _id: new mongoose.Types.ObjectId(), email: `${role.toLowerCase()}@example.com` }, role))
        .query({ category: String(categoryA._id) });
      expect(roleResponse.status).toBe(200);
      expect(rows(roleResponse)).toEqual(rows(subcategoriesResponse));
    }

    const associateIntegrityResponse = await api.get("/api/v1/web/catalog/hierarchy-integrity").set("Cookie", cookie);
    expect(associateIntegrityResponse.status).toBe(403);

    const adminIntegrityResponse = await api
      .get("/api/v1/web/catalog/hierarchy-integrity")
      .set("Cookie", authCookie({ _id: new mongoose.Types.ObjectId(), email: "catalog.admin@example.com" }, "Admin"));
    expect(adminIntegrityResponse.status).toBe(200);
    expect(adminIntegrityResponse.body?.data).toMatchObject({
      duplicates: expect.any(Object),
      orphans: expect.any(Object),
    });
  });
});
