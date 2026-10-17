import { Types } from "mongoose";

export type ReconciliationCandidate = {
  inquiryId: string;
  executionTaskId: string;
  labCompanyId: string;
  actorId: string;
  awardedAt: Date;
};

export type ReconciliationScan = {
  candidates: ReconciliationCandidate[];
  ambiguous: Array<{ inquiryId: string; executionTaskId?: string; reason: string }>;
};

export const scanAwardedLabWork = (inquiries: any[]): ReconciliationScan => {
  const candidates: ReconciliationCandidate[] = [];
  const ambiguous: ReconciliationScan["ambiguous"] = [];
  for (const inquiry of inquiries || []) {
    const inquiryId = String(inquiry?._id || "");
    for (const task of inquiry?.executionInquiries || []) {
      if (String(task?.type || "").toUpperCase() !== "QUALITY_TESTING") continue;
      if (String(task?.status || "").toUpperCase() !== "COMPLETED" && !task?.committedProvider) continue;
      const executionTaskId = String(task?._id || "");
      const labCompanyId = String(task?.committedProvider?._id || task?.committedProvider || "");
      const actorId = String(inquiry?.updatedBy || inquiry?.createdBy || "");
      if (![inquiryId, executionTaskId, labCompanyId, actorId].every((value) => Types.ObjectId.isValid(value))) {
        ambiguous.push({ inquiryId, ...(executionTaskId ? { executionTaskId } : {}), reason: "Missing or invalid inquiry, task, committed lab, or audit actor identifier." });
        continue;
      }
      candidates.push({ inquiryId, executionTaskId, labCompanyId, actorId, awardedAt: new Date(task?.committedAt || inquiry?.updatedAt || inquiry?.createdAt || Date.now()) });
    }
  }
  return { candidates, ambiguous };
};
