import { describe, expect, it } from "vitest";
import { buildInquiryWorkflowSummary } from "./inquiryWorkflowSummary";

describe("buildInquiryWorkflowSummary", () => {
    it("reports buyer pending for an incomplete ALL rule", () => {
        expect(buildInquiryWorkflowSummary(
            { workflowStage: "QUOTATION_REVISION", revisionRequestedAt: new Date() },
            { requiredActions: ["REVISION_REQUESTED", "REVISION_CONFIRMED"], requiredActionMode: "ALL", actionBy: "BUYER" },
        )).toMatchObject({
            pendingParty: "BUYER",
            completedActions: ["REVISION_REQUESTED"],
            pendingActions: ["REVISION_CONFIRMED"],
            isSatisfied: false,
        });
    });

    it("satisfies an ANY rule after one action", () => {
        expect(buildInquiryWorkflowSummary(
            { otherDocsCompletedAt: new Date() },
            { requiredActions: ["OTHER_DOCS_UPLOADED", "OTHER_DOCS_SKIPPED"], requiredActionMode: "ANY", actionBy: "SUPPLIER" },
        )).toMatchObject({ pendingParty: null, pendingActions: [], isSatisfied: true });
    });

    it("does not assign a pending party to a rule with no required actions", () => {
        expect(buildInquiryWorkflowSummary({}, { requiredActions: [], actionBy: "BUYER" }))
            .toMatchObject({ pendingParty: null, isSatisfied: true });
    });
});
