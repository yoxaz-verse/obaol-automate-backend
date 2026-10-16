import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { CategoryModel } from "../src/database/models/category";
import { ProductModel } from "../src/database/models/product";
import { SubCategoryModel } from "../src/database/models/subCategory";
import { generateJWTToken } from "../src/utils/tokenUtils";

const api = request(app);
const tokenFor = (role: string) => generateJWTToken({
  _id: new mongoose.Types.ObjectId(),
  email: `${role.toLowerCase()}-${new mongoose.Types.ObjectId()}@example.com`,
  role,
} as any, "1h");

const createSubCategory = async () => {
  const suffix = new mongoose.Types.ObjectId().toHexString().slice(-8);
  const category = await CategoryModel.create({ name: `Category ${suffix}` });
  const subCategory = await SubCategoryModel.create({
    name: `Subcategory ${suffix}`,
    description: "Deletion test",
    category: category._id,
  });
  return { category, subCategory };
};

describe("admin subcategory deletion", () => {
  it("soft-deletes an empty subcategory and removes it from list and hierarchy reads", async () => {
    const { category, subCategory } = await createSubCategory();
    const adminToken = tokenFor("Admin");

    const deleted = await api.delete(`/api/v1/web/sub-categories/${subCategory._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
    expect((await SubCategoryModel.findById(subCategory._id).lean())?.isDeleted).toBe(true);

    const list = await api.get(`/api/v1/web/sub-categories?category=${category._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.data.map((row: any) => String(row._id))).not.toContain(String(subCategory._id));

    const hierarchy = await api.get(`/api/v1/web/catalog/hierarchy-options?category=${category._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(hierarchy.status).toBe(200);
    expect(hierarchy.body.data.map((row: any) => String(row.id))).not.toContain(String(subCategory._id));

    const deletedAgain = await api.delete(`/api/v1/web/sub-categories/${subCategory._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deletedAgain.status).toBe(404);
  });

  it("rejects deletion while an active product belongs to the subcategory", async () => {
    const { subCategory } = await createSubCategory();
    await ProductModel.create({ name: "Active product", description: "Still active", subCategory: subCategory._id });

    const response = await api.delete(`/api/v1/web/sub-categories/${subCategory._id}`)
      .set("Authorization", `Bearer ${tokenFor("Admin")}`);
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/delete the products/i);
    expect((await SubCategoryModel.findById(subCategory._id).lean())?.isDeleted).toBe(false);
  });

  it("allows deletion when all products in the subcategory are already soft-deleted", async () => {
    const { subCategory } = await createSubCategory();
    await ProductModel.create({
      name: "Deleted product",
      description: "Already removed",
      subCategory: subCategory._id,
      isDeleted: true,
    });

    const response = await api.delete(`/api/v1/web/sub-categories/${subCategory._id}`)
      .set("Authorization", `Bearer ${tokenFor("Admin")}`);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect((await SubCategoryModel.findById(subCategory._id).lean())?.isDeleted).toBe(true);
  });

  it.each(["Associate", "Operator"])("rejects direct deletion by %s users", async (role) => {
    const { subCategory } = await createSubCategory();

    const response = await api.delete(`/api/v1/web/sub-categories/${subCategory._id}`)
      .set("Authorization", `Bearer ${tokenFor(role)}`);
    expect(response.status).toBe(403);
    expect((await SubCategoryModel.findById(subCategory._id).lean())?.isDeleted).toBe(false);
  });
});
