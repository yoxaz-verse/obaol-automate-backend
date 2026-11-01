import * as XLSX from "xlsx";
import mongoose, { ClientSession } from "mongoose";
import { CategoryModel } from "../../database/models/category";
import { SubCategoryModel } from "../../database/models/subCategory";
import { ProductModel } from "../../database/models/product";
import { ProductVariantModel } from "../../database/models/productVariant";
import { badRequest } from "../../core/errors/AppError";
import { normalizeCatalogName } from "./catalogHierarchy.service";

const REQUIRED_HEADERS = ["Category", "Subcategory", "Product", "Variant"] as const;
const OPTIONAL_HEADERS = ["Category Description", "Subcategory Description", "Product Description", "Variant Description"] as const;
export const CATALOG_IMPORT_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

type ImportRow = Record<string, unknown>;
export type CatalogImportSummary = {
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  rows: number;
  errors: Array<{ row: number; message: string }>;
};

const text = (value: unknown) => String(value ?? "").normalize("NFKC").trim();

export function parseCatalogWorkbook(buffer: Buffer): ImportRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw badRequest("The uploaded file is not a readable Excel workbook.");
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw badRequest("The workbook must contain at least one sheet.");
  const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "", raw: false });
  const headerRow = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })[0] || [];
  const headers = new Set(headerRow.map(text));
  const missing = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missing.length) throw badRequest(`Missing required columns: ${missing.join(", ")}.`);
  if (!rows.length) throw badRequest("The workbook does not contain any catalog rows.");
  return rows;
}

const findByNormalizedName = async (model: any, name: string, parent: Record<string, unknown>, session: ClientSession) => {
  const candidates = await model.find({ ...parent, isDeleted: { $ne: true } }).session(session);
  return candidates.find((row: any) => normalizeCatalogName(row.name) === normalizeCatalogName(name)) || null;
};

export async function importCatalogRows(rows: ImportRow[], actorId?: string): Promise<CatalogImportSummary> {
  const summary: CatalogImportSummary = { created: 0, updated: 0, unchanged: 0, rejected: 0, rows: rows.length, errors: [] };
  const valid: Array<{ row: number; values: Record<string, string> }> = [];
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const values = Object.fromEntries(CATALOG_IMPORT_HEADERS.map((header) => [header, text(row[header])]));
    const missing = REQUIRED_HEADERS.filter((header) => !values[header]);
    if (missing.length) {
      summary.errors.push({ row: rowNumber, message: `Missing ${missing.join(", ")}.` });
      return;
    }
    const path = REQUIRED_HEADERS.map((header) => normalizeCatalogName(values[header])).join("/");
    if (seen.has(path)) {
      summary.errors.push({ row: rowNumber, message: `Duplicate catalog path (first appears on row ${seen.get(path)}).` });
      return;
    }
    seen.set(path, rowNumber);
    valid.push({ row: rowNumber, values });
  });
  summary.rejected = summary.errors.length;
  if (summary.errors.length) throw Object.assign(badRequest("Catalog import validation failed."), { details: summary });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const entry of valid) {
        const v = entry.values;
        const levels = [
          { model: CategoryModel, name: v.Category, description: v["Category Description"], parent: {} },
        ] as Array<{ model: any; name: string; description: string; parent: Record<string, unknown> }>;
        let category: any;
        let subCategory: any;
        let product: any;

        for (const level of levels) {
          let record = await findByNormalizedName(level.model, level.name, level.parent, session);
          if (!record) {
            [record] = await level.model.create([{ name: level.name, description: level.description || undefined, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actorId || null }], { session });
            summary.created += 1;
          } else if (level.description && text(record.description) !== level.description) {
            record.description = level.description;
            await record.save({ session });
            summary.updated += 1;
          } else summary.unchanged += 1;
          category = record;
        }

        subCategory = await findByNormalizedName(SubCategoryModel, v.Subcategory, { category: category._id }, session);
        if (!subCategory) {
          [subCategory] = await SubCategoryModel.create([{ name: v.Subcategory, description: v["Subcategory Description"] || undefined, category: category._id, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actorId || null }], { session });
          summary.created += 1;
        } else if (v["Subcategory Description"] && text(subCategory.description) !== v["Subcategory Description"]) {
          subCategory.description = v["Subcategory Description"];
          await subCategory.save({ session }); summary.updated += 1;
        } else summary.unchanged += 1;

        product = await findByNormalizedName(ProductModel, v.Product, { subCategory: subCategory._id }, session);
        if (!product) {
          [product] = await ProductModel.create([{ name: v.Product, description: v["Product Description"] || v.Product, subCategory: subCategory._id, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actorId || null }], { session });
          summary.created += 1;
        } else if (v["Product Description"] && text(product.description) !== v["Product Description"]) {
          product.description = v["Product Description"];
          await product.save({ session }); summary.updated += 1;
        } else summary.unchanged += 1;

        const variant = await findByNormalizedName(ProductVariantModel, v.Variant, { product: product._id }, session);
        if (!variant) {
          await ProductVariantModel.create([{ name: v.Variant, description: v["Variant Description"] || v.Variant, product: product._id, approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actorId || null }], { session });
          summary.created += 1;
        } else if (v["Variant Description"] && text(variant.description) !== v["Variant Description"]) {
          variant.description = v["Variant Description"];
          await variant.save({ session }); summary.updated += 1;
        } else summary.unchanged += 1;
      }
    });
    return summary;
  } finally {
    await session.endSession();
  }
}

export function createCatalogTemplate(): Buffer {
  const sheet = XLSX.utils.json_to_sheet([{
    Category: "Agri", Subcategory: "Spices", Product: "Black Pepper", Variant: "Grade A",
    "Category Description": "", "Subcategory Description": "", "Product Description": "", "Variant Description": "",
  }], { header: CATALOG_IMPORT_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Catalog");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
