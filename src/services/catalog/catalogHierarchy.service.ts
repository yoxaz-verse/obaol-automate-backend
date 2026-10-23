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
