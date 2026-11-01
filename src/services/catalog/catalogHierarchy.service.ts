import mongoose from "mongoose";
import { CategoryModel } from "../../database/models/category";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { SubCategoryModel } from "../../database/models/subCategory";
import { badRequest, notFound } from "../../core/errors/AppError";

type CatalogLevel = "category" | "subCategory" | "product" | "productVariant";
type ParentKey = Exclude<CatalogLevel, "productVariant">;

type CatalogRow = {
    _id?: unknown;
    name?: unknown;
    approvalStatus?: unknown;
    createdByAssociate?: unknown;
    reviewNotes?: unknown;
    category?: unknown;
    subCategory?: unknown;
    product?: unknown;
};

export type CatalogHierarchyOption = {
    id: string;
    name: string;
    level: CatalogLevel;
    parentId: string | null;
    parentName: string | null;
    approvalStatus: string;
    reviewNotes: string;
};

export type CatalogHierarchyInput = {
    query: Record<string, unknown>;
    actor: { id?: string; role?: string } | undefined;
};

export type CatalogProductSearchResult = {
    product: { id: string; name: string };
    subCategory: { id: string; name: string };
    category: { id: string; name: string };
};

export const normalizeCatalogName = (value: unknown) =>
    String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en");

const displayName = (value: unknown) => String(value || "").normalize("NFKC").trim();

const canReadCatalogNode = (row: CatalogRow, actor: CatalogHierarchyInput["actor"]) => {
    const role = String(actor?.role || "").toLowerCase();
    return role === "admin"
        || String(row.approvalStatus || "APPROVED") === "APPROVED"
        || (role === "associate" && String(row.createdByAssociate || "") === String(actor?.id || ""));
};

const visibilityFor = (actor: CatalogHierarchyInput["actor"]) =>
    String(actor?.role || "").toLowerCase() === "admin"
        ? {}
        : { $or: [{ approvalStatus: { $in: ["APPROVED", null] } }, { createdByAssociate: actor?.id }] };

const asRows = (value: unknown): CatalogRow[] => Array.isArray(value) ? value as CatalogRow[] : [];

export async function getCatalogHierarchyOptions({ query, actor }: CatalogHierarchyInput): Promise<CatalogHierarchyOption[]> {
    const filters = (["category", "subCategory", "product"] as ParentKey[])
        .filter((key) => String(query[key] || "").trim());
    if (filters.length > 1) throw badRequest("Provide only one catalog parent filter.");

    const parentKey = filters[0];
    const parentId = parentKey ? String(query[parentKey] || "").trim() : "";
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
        throw badRequest(`Invalid ${parentKey} id.`);
    }

    let rows: CatalogRow[] = [];
    let level: CatalogLevel = "category";
    let parentName: string | null = null;
    const visibility = visibilityFor(actor);

    if (!parentKey) {
        rows = asRows(await CategoryModel.find(visibility)
            .select("_id name approvalStatus createdByAssociate reviewNotes").lean());
    } else if (parentKey === "category") {
        level = "subCategory";
        const parent = await CategoryModel.findById(parentId)
            .select("name approvalStatus createdByAssociate").lean() as CatalogRow | null;
        if (!parent || !canReadCatalogNode(parent, actor)) throw notFound("Category was not found.");
        parentName = displayName(parent.name);
        rows = asRows(await SubCategoryModel.find({ category: parentId, isDeleted: { $ne: true }, ...visibility })
            .select("_id name category approvalStatus createdByAssociate reviewNotes").lean());
    } else if (parentKey === "subCategory") {
        level = "product";
        const parent = await SubCategoryModel.findOne({ _id: parentId, isDeleted: { $ne: true } })
            .select("name approvalStatus createdByAssociate").lean() as CatalogRow | null;
        if (!parent || !canReadCatalogNode(parent, actor)) throw notFound("Subcategory was not found.");
        parentName = displayName(parent.name);
        rows = asRows(await ProductModel.find({ subCategory: parentId, isDeleted: { $ne: true }, ...visibility })
            .select("_id name subCategory approvalStatus createdByAssociate reviewNotes").lean());
    } else {
        level = "productVariant";
        const parent = await ProductModel.findOne({ _id: parentId, isDeleted: { $ne: true } })
            .select("name approvalStatus createdByAssociate").lean() as CatalogRow | null;
        if (!parent || !canReadCatalogNode(parent, actor)) throw notFound("Product was not found.");
        parentName = displayName(parent.name);
        rows = asRows(await ProductVariantModel.find({ product: parentId, isDeleted: { $ne: true }, ...visibility })
            .select("_id name product approvalStatus createdByAssociate reviewNotes").lean());
    }

    return rows.map((row) => ({
        id: String(row._id || ""),
        name: displayName(row.name),
        level,
        parentId: parentKey ? String(row[parentKey] || "") : null,
        parentName,
        approvalStatus: String(row.approvalStatus || "APPROVED"),
        reviewNotes: String(row.reviewNotes || ""),
    })).filter((row) => row.id && row.name)
        .sort((left, right) => normalizeCatalogName(left.name).localeCompare(normalizeCatalogName(right.name), "en"));
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function searchCatalogProducts(query: unknown, actor: CatalogHierarchyInput["actor"], limitValue?: unknown): Promise<CatalogProductSearchResult[]> {
    const search = displayName(query);
    if (search.length < 2) return [];
    const limit = Math.min(Math.max(Number(limitValue) || 20, 1), 50);
    const products = await ProductModel.find({
        name: { $regex: escapeRegex(search), $options: "i" },
        isDeleted: { $ne: true },
        ...visibilityFor(actor),
    }).select("_id name subCategory").limit(limit * 3).lean() as CatalogRow[];
    if (!products.length) return [];
    const subCategories = await SubCategoryModel.find({
        _id: { $in: products.map((row) => row.subCategory) }, isDeleted: { $ne: true }, ...visibilityFor(actor),
    }).select("_id name category").lean() as CatalogRow[];
    const categories = await CategoryModel.find({
        _id: { $in: subCategories.map((row) => row.category) }, isDeleted: { $ne: true }, ...visibilityFor(actor),
    }).select("_id name").lean() as CatalogRow[];
    const subById = new Map(subCategories.map((row) => [String(row._id), row]));
    const categoryById = new Map(categories.map((row) => [String(row._id), row]));
    return products.flatMap((product) => {
        const subCategory = subById.get(String(product.subCategory));
        const category = subCategory ? categoryById.get(String(subCategory.category)) : undefined;
        if (!subCategory || !category) return [];
        return [{
            product: { id: String(product._id), name: displayName(product.name) },
            subCategory: { id: String(subCategory._id), name: displayName(subCategory.name) },
            category: { id: String(category._id), name: displayName(category.name) },
        }];
    }).slice(0, limit).sort((a, b) => normalizeCatalogName(a.product.name).localeCompare(normalizeCatalogName(b.product.name), "en"));
}
