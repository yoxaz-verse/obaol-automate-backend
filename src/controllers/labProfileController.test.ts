import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { buildLabOfferingFilter, validateLabSnapshot } from "./labProfileController";

const id = () => new Types.ObjectId().toString();
const base = () => ({ displayName: "Lab", contactEmail: "lab@example.com", contactPhone: "1", address: "Address", physicalCountryId: id(), credentials: [] });

describe("country-first lab profile rules", () => {
  it("publishes basic country and product coverage without optional testing details", () => {
    const templateId = id();
    expect(validateLabSnapshot({ ...base(), productCapabilityTemplates: [{ _id: templateId, name: "Turmeric", commodityId: id(), testIds: [], parameterIds: [], qualityClassifications: [], credentialIds: [] }], countryAssignments: [{ countryId: id(), productTemplateIds: [templateId] }] })).toEqual([]);
  });

  it("reuses one template across 100 countries without duplicating capability data", () => {
    const templateId = id();
    const snapshot = { ...base(), productCapabilityTemplates: [{ _id: templateId, name: "Organic Turmeric", commodityId: id(), qualityClassifications: ["ORGANIC"], testIds: [id()], parameterIds: [id()], credentialIds: [] }], countryAssignments: Array.from({ length: 100 }, () => ({ countryId: id(), productTemplateIds: [templateId] })) };
    expect(validateLabSnapshot(snapshot)).toEqual([]);
    expect(snapshot.productCapabilityTemplates).toHaveLength(1);
    expect(new Set(snapshot.countryAssignments.flatMap((item) => item.productTemplateIds))).toEqual(new Set([templateId]));
  });

  it("rejects duplicate countries and missing template references", () => {
    const countryId = id(), templateId = id();
    const errors = validateLabSnapshot({ ...base(), productCapabilityTemplates: [{ _id: templateId, name: "Product", commodityId: id(), credentialIds: [] }], countryAssignments: [{ countryId, productTemplateIds: [templateId] }, { countryId, productTemplateIds: [id()] }] });
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining("duplicates a country"), expect.stringContaining("missing product template")]));
  });

  it("builds all optional filters into one product-template match", () => {
    const commodity = id(), test = id(), parameter = id(), accreditation = id();
    expect(buildLabOfferingFilter({ commodityIds: commodity, testIds: test, parameterIds: parameter, accreditationIds: accreditation, qualityClassifications: "ORGANIC,IPM" })).toEqual({ commodityId: { $in: [commodity] }, testIds: { $all: [test] }, parameterIds: { $all: [parameter] }, credentialIds: { $all: [accreditation] }, qualityClassifications: { $all: ["ORGANIC", "IPM"] } });
  });
});
