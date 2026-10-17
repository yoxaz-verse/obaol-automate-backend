import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { scanAwardedLabWork } from "./labWorkReconciliation";

const id = () => new Types.ObjectId();

describe("lab work reconciliation", () => {
  it("returns only awarded quality-testing tasks as deterministic candidates", () => {
    const inquiryId = id(); const taskId = id(); const labId = id(); const actorId = id();
    const result = scanAwardedLabWork([{ _id: inquiryId, createdBy: actorId, executionInquiries: [
      { _id: taskId, type: "QUALITY_TESTING", status: "COMPLETED", committedProvider: labId, committedAt: new Date("2026-01-02") },
      { _id: id(), type: "WAREHOUSE", status: "COMPLETED", committedProvider: id() },
      { _id: id(), type: "QUALITY_TESTING", status: "OPEN" },
    ] }]);
    expect(result.ambiguous).toEqual([]);
    expect(result.candidates).toEqual([{ inquiryId: String(inquiryId), executionTaskId: String(taskId), labCompanyId: String(labId), actorId: String(actorId), awardedAt: new Date("2026-01-02") }]);
  });

  it("reports malformed historical awards instead of guessing", () => {
    const result = scanAwardedLabWork([{ _id: id(), executionInquiries: [{ _id: id(), type: "QUALITY_TESTING", status: "COMPLETED", committedProvider: "invalid" }] }]);
    expect(result.candidates).toEqual([]);
    expect(result.ambiguous).toHaveLength(1);
  });
});
