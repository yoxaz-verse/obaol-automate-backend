import { InquiryAccessContext, UserRole } from "./inquiryAccessControl";

type UnknownRecord = Record<string, unknown>;
export type TradeInputContributor = "BUYER" | "SELLER" | "OBAOL";

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};

const identifier = (value: unknown): string => {
  const record = asRecord(value);
  return String(record._id ?? value ?? "");
};

export const buildInquiryAccessContext = (user: unknown): InquiryAccessContext => {
  const actor = asRecord(user);
  const userId = String(actor.id ?? actor._id ?? "");
  const userRole = String(actor.role ?? "");
  return {
    userId,
    userRole,
    associateId: actor.associateId ?? (userRole === UserRole.ASSOCIATE ? userId : null),
    associateCompanyId: actor.associateCompany ?? null,
  } as InquiryAccessContext;
};

export const resolveTradeInputContributor = (user: unknown, inquiry: unknown): TradeInputContributor => {
  const actor = asRecord(user);
  const role = String(actor.role ?? "").toLowerCase();
  if (["admin", "operator", "team"].includes(role)) return "OBAOL";
  const actorId = String(actor.associateId ?? actor.id ?? actor._id ?? "");
  const participants = asRecord(inquiry);
  if (identifier(participants.buyerAssociateId) === actorId) return "BUYER";
  if (identifier(participants.sellerAssociateId) === actorId) return "SELLER";
  return "OBAOL";
};

export const getPartyLocation = (associate: unknown, companyOverride?: unknown) => {
  const participant = asRecord(associate);
  const company = companyOverride ? asRecord(companyOverride) : asRecord(participant.associateCompany);
  const district = String(asRecord(company.district).name ?? asRecord(participant.district).name ?? "").trim() || null;
  const state = String(asRecord(company.state).name ?? asRecord(participant.state).name ?? "").trim() || null;
  return { district, state, label: [district, state].filter(Boolean).join(", ") || "Location not provided" };
};
