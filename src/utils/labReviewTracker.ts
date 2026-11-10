import { SystemConfigModel } from "../database/models/systemConfig";

export const LAB_REVIEW_SLA_KEY = "LAB_REVIEW_SLA_BUSINESS_DAYS";
export const DEFAULT_LAB_REVIEW_BUSINESS_DAYS = 5;

export function normalizeLabReviewBusinessDays(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : DEFAULT_LAB_REVIEW_BUSINESS_DAYS;
}

export async function getLabReviewBusinessDays() {
  const row = await SystemConfigModel.findOne({ key: LAB_REVIEW_SLA_KEY }).select("value").lean();
  return normalizeLabReviewBusinessDays(row?.value);
}

export function addBusinessDays(value: Date | string, days: number) {
  const result = new Date(value);
  let remaining = normalizeLabReviewBusinessDays(days);
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

export function businessDaysElapsed(value: Date | string, now: Date = new Date()) {
  const cursor = new Date(value);
  if (Number.isNaN(cursor.getTime()) || cursor >= now) return 0;
  let elapsed = 0;
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(now); end.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) elapsed += 1;
  }
  return elapsed;
}

type HistoryEvent = { status: string; at: Date | string; actorType?: string; note?: string };

export function deriveLabStatusHistory(row: any): HistoryEvent[] {
  if (Array.isArray(row.statusHistory) && row.statusHistory.length) return row.statusHistory;
  const events: HistoryEvent[] = [];
  if (row.createdAt) events.push({ status: "DRAFT", at: row.createdAt, actorType: "OWNER" });
  if (row.submittedAt) events.push({ status: "PENDING_REVIEW", at: row.submittedAt, actorType: "OWNER" });
  if (row.status === "PUBLISHED" && row.publishedAt) events.push({ status: "PUBLISHED", at: row.publishedAt, actorType: "ADMIN", note: row.reviewNotes || "" });
  if (row.status === "REJECTED") events.push({ status: "REJECTED", at: row.updatedAt, actorType: "ADMIN", note: row.reviewNotes || "" });
  if (row.status === "ARCHIVED" && row.archivedAt) events.push({ status: "ARCHIVED", at: row.archivedAt, actorType: "OWNER" });
  return events;
}

export function withLabReviewMetadata(row: any, businessDays: number, now: Date = new Date()) {
  const submittedAt = row.submittedAt ? new Date(row.submittedAt) : null;
  const pending = row.status === "PENDING_REVIEW" && submittedAt && !Number.isNaN(submittedAt.getTime());
  const reviewTargetAt = submittedAt ? addBusinessDays(submittedAt, businessDays) : null;
  return {
    ...row,
    statusHistory: deriveLabStatusHistory(row),
    reviewTargetAt,
    businessDaysPending: pending ? businessDaysElapsed(submittedAt, now) : 0,
    isReviewOverdue: Boolean(pending && reviewTargetAt && now > reviewTargetAt),
    reviewSlaBusinessDays: businessDays,
  };
}
