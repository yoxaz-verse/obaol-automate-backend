import { describe, expect, it } from "vitest";
import { normalizeAgritechSnapshot, validateAgritechSnapshot } from "./agritechProfileController";

const valid = {
  displayName: "Farm Systems", website: "https://farm.example", shortDescription: "Traceability for agricultural supply chains.", companyDescription: "Connects farm records to commodity execution.",
  workflowStages: ["TRACEABILITY"], otherProblem: "", hasApi: true, apiDocumentationUrl: "https://farm.example/docs", apiSummary: "REST API",
  coverageMode: "SELECTED_STATES", coverageStates: ["Karnataka"], contactEmail: "hello@farm.example", contactPhone: "+919999999999", whatsappPhone: "",
  headquarters: { address: "Bengaluru", city: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
};

describe("agritech profile validation", () => {
  it("accepts a complete selected-state API profile and creates GeoJSON", () => {
    const snapshot: any = normalizeAgritechSnapshot(valid);
    expect(validateAgritechSnapshot(snapshot)).toEqual([]);
    expect(snapshot.headquarters.point.coordinates).toEqual([77.5946, 12.9716]);
  });
  it("requires selected states and an explanation for Other", () => {
    const snapshot: any = normalizeAgritechSnapshot({ ...valid, workflowStages: ["OTHER"], otherProblem: "", coverageStates: [] });
    expect(validateAgritechSnapshot(snapshot)).toEqual(expect.arrayContaining(["Describe the other problem being solved", "Select at least one operational state"]));
  });
  it("clears API details and states when their controlling choices are disabled", () => {
    const snapshot: any = normalizeAgritechSnapshot({ ...valid, hasApi: false, coverageMode: "ALL_INDIA" });
    expect(snapshot.apiDocumentationUrl).toBe(""); expect(snapshot.apiSummary).toBe(""); expect(snapshot.coverageStates).toEqual([]);
  });
});
