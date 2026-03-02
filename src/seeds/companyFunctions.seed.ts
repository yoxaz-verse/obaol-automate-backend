import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CompanySubFunctionModel } from "../database/models/companySubFunction";

const slugify = (value: string) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const COMPANY_FUNCTION_SEED = [
  {
    name: "Sourcing & Procurement",
    slug: "procurement",
    subFunctions: [
      "Raw Material Procurement",
      "Farmer Aggregation",
      "Mandis / Trade Sourcing",
      "Commodity Brokerage",
      "Export Order Sourcing",
    ],
  },
  {
    name: "Processing & Packaging",
    slug: "packaging",
    subFunctions: [
      "Cleaning / Sorting",
      "Grading",
      "Private Label Packaging",
      "Bulk Packaging",
      "Vacuum / Retail Packing",
      "Value Addition Processing",
    ],
  },
  {
    name: "Testing & Certification",
    slug: "quality-testing",
    subFunctions: [
      "Lab Testing (Residue / Quality)",
      "FSSAI Compliance",
      "Phytosanitary Certification",
      "Organic Certification",
      "Inspection Services",
      "Export Documentation Support",
    ],
  },
  {
    name: "Logistics Services",
    slug: "shipping",
    subFunctions: [
      "Sea Freight (Export)",
      "Sea Freight (Import)",
      "Air Freight",
      "Customs Clearance (Export)",
      "Customs Clearance (Import)",
      "Inland Transport",
      "Reefer Logistics",
      "LCL Consolidation",
      "Warehousing",
      "Cold Storage",
    ],
  },
  {
    name: "Finance & Risk Support",
    slug: "finance-risk",
    subFunctions: [
      "Trade Finance",
      "LC Handling",
      "ECGC Advisory",
      "Insurance (Marine / Cargo)",
      "Forex Advisory",
    ],
  },
  {
    name: "Market & Trade Support",
    slug: "market-support",
    subFunctions: [
      "Export Consulting",
      "Market Intelligence",
      "Buyer Sourcing",
      "International Marketing",
      "Trade Compliance Advisory",
    ],
  },
];

export const seedCompanyFunctions = async () => {
  for (let i = 0; i < COMPANY_FUNCTION_SEED.length; i += 1) {
    const fn = COMPANY_FUNCTION_SEED[i];
    const functionDoc = await CompanyFunctionModel.findOneAndUpdate(
      { slug: fn.slug },
      {
        $set: {
          name: fn.name,
          description: "",
          isActive: true,
          orderIndex: i + 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (let j = 0; j < fn.subFunctions.length; j += 1) {
      const subName = fn.subFunctions[j];
      await CompanySubFunctionModel.findOneAndUpdate(
        { functionId: functionDoc._id, slug: slugify(subName) },
        {
          $set: {
            name: subName,
            description: "",
            isActive: true,
            orderIndex: j + 1,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
};
