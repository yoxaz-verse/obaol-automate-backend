import { createHash, randomBytes } from "crypto";
import { NextFunction, Request, Response } from "express";
import { ASSOCIATE_ROLE_SLUGS, RealLifeScenarioModel, SCENARIO_BLOCK_TYPES } from "../database/models/realLifeScenario";

const roles = new Set<string>(ASSOCIATE_ROLE_SLUGS);
const blockTypes = new Set<string>(SCENARIO_BLOCK_TYPES);
const isAdmin = (req: Request) => String(req.user?.role || "").toLowerCase() === "admin";
const clean = (value: unknown, max = 5000) => String(value ?? "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const safeUrl = (value: unknown, allowRelative = true) => {
  const url = clean(value, 2000);
  if (!url) return "";
  if (allowRelative && /^\/(?!\/)/.test(url)) return url;
  return /^https?:\/\//i.test(url) ? url : "";
};
const slugify = (value: unknown) => clean(value, 180).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const publicNowFilter = () => ({
  $or: [
    { status: "PUBLISHED" },
    { status: "SCHEDULED", scheduledAt: { $lte: new Date() } },
  ],
});

const sanitizeBlocks = (input: unknown) => Array.isArray(input) ? input.slice(0, 100).map((raw: any) => {
  const type = blockTypes.has(String(raw?.type)) ? String(raw.type) : "paragraph";
  const block: any = { type };
  if (type === "heading") block.level = [2, 3, 4].includes(Number(raw?.level)) ? Number(raw.level) : 2;
  if (raw?.text !== undefined) block.text = clean(raw.text);
  if (raw?.title !== undefined) block.title = clean(raw.title, 300);
  if (raw?.href !== undefined) block.href = safeUrl(raw.href);
  if (raw?.imageUrl !== undefined) block.imageUrl = safeUrl(raw.imageUrl, false);
  if (raw?.imageAlt !== undefined) block.imageAlt = clean(raw.imageAlt, 300);
  if (Array.isArray(raw?.items)) block.items = raw.items.slice(0, 30).map((item: unknown) => clean(item, 1000)).filter(Boolean);
  return block;
}): [];

const sanitizeFaqs = (input: unknown) => Array.isArray(input) ? input.slice(0, 20).map((faq: any) => ({
  question: clean(faq?.question, 500), answer: clean(faq?.answer, 3000),
})).filter((faq) => faq.question && faq.answer) : [];

const sanitizePayload = (body: any) => {
  const heroImageUrl = safeUrl(body?.heroImageUrl, false);
  const payload: any = {
    internalTitle: clean(body?.internalTitle, 200), h1: clean(body?.h1, 200),
    roleSlug: clean(body?.roleSlug, 100), slug: slugify(body?.slug || body?.h1),
    excerpt: clean(body?.excerpt, 500), scenarioType: "REPRESENTATIVE",
    disclosureAccepted: body?.disclosureAccepted === true, blocks: sanitizeBlocks(body?.blocks),
    primaryKeyword: clean(body?.primaryKeyword, 160),
    supportingKeywords: Array.isArray(body?.supportingKeywords) ? body.supportingKeywords.slice(0, 20).map((v: unknown) => clean(v, 160)).filter(Boolean) : [],
    audienceIntent: clean(body?.audienceIntent, 500), seoTitle: clean(body?.seoTitle, 200),
    seoDescription: clean(body?.seoDescription, 500), heroImageUrl,
    heroImageAlt: clean(body?.heroImageAlt, 300), faqs: sanitizeFaqs(body?.faqs),
    cta: { label: clean(body?.cta?.label, 120), href: safeUrl(body?.cta?.href) },
    displayOrder: Math.max(0, Number(body?.displayOrder) || 0),
  };
  return payload;
};

const publishErrors = (row: any) => {
  const errors: string[] = [];
  for (const key of ["roleSlug", "h1", "slug", "excerpt", "seoTitle", "seoDescription", "primaryKeyword"])
    if (!row?.[key]) errors.push(`${key} is required`);
  if (!Array.isArray(row?.blocks) || !row.blocks.length) errors.push("At least one content block is required");
  if (row?.heroImageUrl && !row?.heroImageAlt) errors.push("Hero image alt text is required");
  if (row?.blocks?.some((block: any) => block.type === "image" && (!block.imageUrl || !block.imageAlt))) errors.push("Every image block requires a safe URL and alt text");
  if (!row?.disclosureAccepted) errors.push("Representative-scenario disclosure must be accepted");
  return errors;
};

const handleDuplicate = (error: any, res: Response, next: NextFunction) => {
  if (error?.code === 11000) return res.status(409).json({ success: false, message: "A scenario with this slug already exists for the role." });
  return next(error);
};

export const realLifeScenarioController = {
  async publicList(req: Request, res: Response, next: NextFunction) {
    try {
      const roleSlug = clean(req.query.roleSlug, 100);
      if (roleSlug && !roles.has(roleSlug)) return res.status(400).json({ success: false, message: "Invalid roleSlug." });
      const filter: any = publicNowFilter();
      if (roleSlug) filter.roleSlug = roleSlug;
      const rows = await RealLifeScenarioModel.find(filter).select("-previewTokenHash -previewExpiresAt").sort({ roleSlug: 1, displayOrder: 1, publishedAt: -1 }).lean();
      return res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  },
  async publicDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await RealLifeScenarioModel.findOne({ roleSlug: clean(req.params.roleSlug, 100), slug: slugify(req.params.slug), ...publicNowFilter() }).select("-previewTokenHash -previewExpiresAt").lean();
      if (!row) return res.status(404).json({ success: false, message: "Scenario not found." });
      return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  },
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const token = clean(req.query.token, 500);
      const row = await RealLifeScenarioModel.findOne({ _id: req.params.id, previewTokenHash: hashToken(token), previewExpiresAt: { $gt: new Date() } }).select("+previewTokenHash +previewExpiresAt").lean();
      if (!row) return res.status(404).json({ success: false, message: "Preview expired or not found." });
      const { previewTokenHash, previewExpiresAt, ...data } = row as any;
      return res.json({ success: true, data });
    } catch (error) { next(error); }
  },
  async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const filter: any = {};
      if (req.query.roleSlug) filter.roleSlug = clean(req.query.roleSlug, 100);
      if (req.query.status) filter.status = clean(req.query.status, 30);
      if (req.query.q) filter.$text = { $search: clean(req.query.q, 200) };
      const rows = await RealLifeScenarioModel.find(filter).select("-previewTokenHash -previewExpiresAt").sort({ roleSlug: 1, displayOrder: 1, updatedAt: -1 }).lean();
      const counts = await RealLifeScenarioModel.aggregate([{ $group: { _id: "$roleSlug", total: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] } } } }]);
      return res.json({ success: true, data: rows, counts });
    } catch (error) { next(error); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const payload = sanitizePayload(req.body);
      if (!roles.has(payload.roleSlug) || !payload.internalTitle || !payload.h1 || !payload.slug || !payload.excerpt)
        return res.status(400).json({ success: false, message: "Valid roleSlug, internalTitle, h1, slug and excerpt are required." });
      if (await RealLifeScenarioModel.exists({ roleSlug: payload.roleSlug, slug: payload.slug }))
        return res.status(409).json({ success: false, message: "A scenario with this slug already exists for the role." });
      const row = await RealLifeScenarioModel.create({ ...payload, status: "DRAFT", createdBy: req.user?.id || null, updatedBy: req.user?.id || null });
      return res.status(201).json({ success: true, data: row });
    } catch (error: any) { handleDuplicate(error, res, next); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const payload = sanitizePayload(req.body);
      if (!roles.has(payload.roleSlug)) return res.status(400).json({ success: false, message: "Invalid roleSlug." });
      if (await RealLifeScenarioModel.exists({ _id: { $ne: req.params.id }, roleSlug: payload.roleSlug, slug: payload.slug }))
        return res.status(409).json({ success: false, message: "A scenario with this slug already exists for the role." });
      const row = await RealLifeScenarioModel.findByIdAndUpdate(req.params.id, { ...payload, updatedBy: req.user?.id || null }, { new: true, runValidators: true });
      if (!row) return res.status(404).json({ success: false, message: "Scenario not found." });
      return res.json({ success: true, data: row });
    } catch (error: any) { handleDuplicate(error, res, next); }
  },
  async transition(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const action = clean(req.body?.action, 30).toUpperCase();
      const row: any = await RealLifeScenarioModel.findById(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: "Scenario not found." });
      if (["PUBLISH", "SCHEDULE"].includes(action)) {
        const errors = publishErrors(row);
        if (errors.length) return res.status(400).json({ success: false, message: "Scenario is not ready to publish.", errors });
      }
      if (action === "PUBLISH") { row.status = "PUBLISHED"; row.publishedAt = new Date(); row.scheduledAt = null; }
      else if (action === "SCHEDULE") {
        const scheduledAt = new Date(req.body?.scheduledAt);
        if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) return res.status(400).json({ success: false, message: "A future scheduledAt is required." });
        row.status = "SCHEDULED"; row.scheduledAt = scheduledAt;
      } else if (action === "UNPUBLISH") { row.status = "DRAFT"; row.scheduledAt = null; }
      else if (action === "ARCHIVE") { row.status = "ARCHIVED"; row.scheduledAt = null; }
      else return res.status(400).json({ success: false, message: "Invalid transition action." });
      row.updatedBy = req.user?.id || null;
      await row.save();
      return res.json({ success: true, data: row });
    } catch (error) { next(error); }
  },
  async previewToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const row = await RealLifeScenarioModel.findByIdAndUpdate(req.params.id, { previewTokenHash: hashToken(token), previewExpiresAt: expiresAt }, { new: true });
      if (!row) return res.status(404).json({ success: false, message: "Scenario not found." });
      return res.json({ success: true, data: { token, expiresAt } });
    } catch (error) { next(error); }
  },
  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!isAdmin(req)) return res.status(403).json({ success: false, message: "Admin access required." });
      const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
      await Promise.all(items.map((item: any) => RealLifeScenarioModel.updateOne({ _id: item.id }, { displayOrder: Math.max(0, Number(item.displayOrder) || 0), updatedBy: req.user?.id || null })));
      return res.json({ success: true, message: "Scenario order updated." });
    } catch (error) { next(error); }
  },
};
