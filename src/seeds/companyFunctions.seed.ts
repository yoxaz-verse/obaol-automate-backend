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
    name: "Sourcing",
    slug: "sourcing",
    subFunctions: [],
  },
  {
    name: "Packaging",
    slug: "packaging",
    subFunctions: [],
  },
  {
    name: "Quality Testing & Labs",
    slug: "testing",
    subFunctions: [],
  },
  {
    name: "Warehouse / Storage",
    slug: "warehouse-storage",
    subFunctions: [],
  },
  {
    name: "Finance & Insurance",
    slug: "finance-risk",
    subFunctions: [],
  },
  {
    name: "Importing & Distribution",
    slug: "importing-distribution",
    subFunctions: [],
  },
  {
    name: "Freight Forwarding",
    slug: "freight-forwarding",
    subFunctions: [],
  },
  {
    name: "Inland Logistics",
    slug: "inland-logistics",
    subFunctions: [],
  },
];

export const seedCompanyFunctions = async () => {
  const allowedSlugs = COMPANY_FUNCTION_SEED.map((fn) => fn.slug);
  for (let i = 0; i < COMPANY_FUNCTION_SEED.length; i += 1) {
    const fn = COMPANY_FUNCTION_SEED[i];
    const functionDoc = await CompanyFunctionModel.findOneAndUpdate(
      { $or: [{ slug: fn.slug }, { name: fn.name }] },
      {
        $set: {
          name: fn.name,
          description: "",
          isActive: true,
          orderIndex: i + 1,
          slug: fn.slug,
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

  await CompanyFunctionModel.updateMany(
    { slug: { $nin: allowedSlugs } },
    { $set: { isActive: false } }
  );
};
