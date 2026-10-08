import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { InventoryManagerModel } from "../database/models/inventoryManager";
import { OperatorModel } from "../database/models/operator";

type ExportFormat = "csv" | "xlsx";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const asDateTime = (value: any) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : date.toISOString();
};
const asText = (value: any): string => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (Array.isArray(value)) return value.map(asText).join(", ");
  if (typeof value === "object") return value.name || value.label || value.title || "N/A";
  return String(value);
};
const yesNo = (value: any) => value ? "Yes" : "No";

const csvCell = (value: any) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const EXPORT_CONFIG: Record<string, any> = {
  admin: {
    model: AdminModel,
    entity: "admins",
    search: ["name", "email"],
    filters: ["name", "email"],
    populate: [],
    columns: [
      ["Name", (row: any) => asText(row.name)],
      ["Email", (row: any) => asText(row.email)],
      ["Last Seen", (row: any) => asDateTime(row.lastSeenAt)],
      ["Last Login", (row: any) => asDateTime(row.lastLoginAt)],
      ["Created At", (row: any) => asDateTime(row.createdAt)],
    ],
  },
  inventoryManager: {
    model: InventoryManagerModel,
    entity: "inventory-managers",
    search: ["name", "email"],
    filters: ["name", "email", "admin"],
    populate: [{ path: "admin", select: "name" }],
    columns: [
      ["Name", (row: any) => asText(row.name)],
      ["Email", (row: any) => asText(row.email)],
      ["Admin", (row: any) => asText(row.admin)],
      ["Last Seen", (row: any) => asDateTime(row.lastSeenAt)],
      ["Last Login", (row: any) => asDateTime(row.lastLoginAt)],
      ["Created At", (row: any) => asDateTime(row.createdAt)],
    ],
  },
  associate: {
    model: AssociateModel,
    entity: "associates",
    search: ["name", "email", "phone"],
    filters: ["name", "email", "phone", "designation", "associateCompany", "isActive", "isCompanyVerified", "isEmailVerified", "registrationStatus", "onboardingContactPreference"],
    populate: [{ path: "associateCompany", select: "name" }, { path: "designation", select: "name" }],
    columns: [
      ["Associate Name", (row: any) => asText(row.name)],
      ["Email", (row: any) => asText(row.email)],
      ["Phone", (row: any) => asText(row.phone)],
      ["Phone Secondary", (row: any) => asText(row.phoneSecondary)],
      ["Account Active", (row: any) => yesNo(row.isActive)],
      ["Company Verified", (row: any) => yesNo(row.isCompanyVerified)],
      ["Email Verified", (row: any) => yesNo(row.isEmailVerified)],
      ["Registration Status", (row: any) => asText(row.registrationStatus)],
      ["Contact Preference", (row: any) => asText(row.onboardingContactPreference)],
      ["Designation", (row: any) => asText(row.designation)],
      ["Company", (row: any) => asText(row.associateCompany)],
      ["Last Seen", (row: any) => asDateTime(row.lastSeenAt)],
      ["Last Login", (row: any) => asDateTime(row.lastLoginAt)],
      ["Created At", (row: any) => asDateTime(row.createdAt)],
    ],
  },
  operator: {
    model: OperatorModel,
    entity: "operators",
    search: ["name", "email", "phone"],
    filters: ["name", "email", "phone", "state", "district", "jobType", "jobRole"],
    populate: [
      { path: "state", select: "name" }, { path: "district", select: "name" },
      { path: "jobType", select: "name" }, { path: "jobRole", select: "name" },
      { path: "languageKnown", select: "name" },
    ],
    columns: [
      ["Name", (row: any) => asText(row.name)],
      ["Phone Number", (row: any) => asText(row.phone)],
      ["Email", (row: any) => asText(row.email)],
      ["State", (row: any) => asText(row.state)],
      ["District", (row: any) => asText(row.district)],
      ["Language Known", (row: any) => asText(row.languageKnown)],
      ["Last Seen", (row: any) => asDateTime(row.lastSeenAt)],
      ["Last Login", (row: any) => asDateTime(row.lastLoginAt)],
      ["Created At", (row: any) => asDateTime(row.createdAt)],
    ],
  },
};

const buildFilter = (req: Request, config: any) => {
  const query: Record<string, any> = { isDeleted: { $ne: true } };
  const search = String(req.query.search || "").trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    query.$or = config.search.map((field: string) => ({ [field]: regex }));
  }
  for (const field of config.filters) {
    const raw = req.query[field];
    if (raw === undefined || raw === null || raw === "") continue;
    if (raw === "true") query[field] = true;
    else if (raw === "false") query[field] = false;
    else if (Array.isArray(raw)) query[field] = { $in: raw };
    else query[field] = raw;
  }
  return query;
};

export const exportUsers = async (req: Request, res: Response) => {
  try {
    const userType = String(req.query.userType || "");
    const format = String(req.query.format || "csv").toLowerCase() as ExportFormat;
    const config = EXPORT_CONFIG[userType];
    if (!config) return res.status(400).json({ success: false, message: "Invalid user type." });
    if (format !== "csv" && format !== "xlsx") {
      return res.status(400).json({ success: false, message: "Format must be csv or xlsx." });
    }

    let dbQuery = config.model.find(buildFilter(req, config)).sort({ createdAt: -1, _id: -1 }).lean();
    if (config.populate.length) dbQuery = dbQuery.populate(config.populate);
    const records = await dbQuery;
    const headers = config.columns.map(([label]: [string, Function]) => label);
    const rows = records.map((record: any) => Object.fromEntries(
      config.columns.map(([label, getter]: [string, Function]) => [label, getter(record)])
    ));
    const date = new Date().toISOString().slice(0, 10);
    const baseName = `obaol-${config.entity}-${date}`;

    if (format === "csv") {
      const csv = [headers.map(csvCell).join(","), ...rows.map((row: any) => headers.map((header: string) => csvCell(row[header])).join(","))].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.csv"`);
      return res.send(`\uFEFF${csv}`);
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
    worksheet["!cols"] = headers.map((header: string) => ({ wch: Math.max(14, header.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xlsx"`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || "Unable to export users." });
  }
};
