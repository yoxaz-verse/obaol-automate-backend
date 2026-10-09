import { describe, expect, it } from "vitest";
import { CompanyFunctionModel } from "../database/models/companyFunction";
import { CANONICAL_COMPANY_FUNCTION_SLUGS } from "../utils/companyCapabilities";
import { COMPANY_FUNCTION_SEED, seedCompanyFunctions } from "./companyFunctions.seed";

describe("company function seed", () => {
  it("creates the complete canonical taxonomy idempotently", async () => {
    await seedCompanyFunctions();
    await seedCompanyFunctions();

    const rows = await CompanyFunctionModel.find({
      slug: { $in: CANONICAL_COMPANY_FUNCTION_SLUGS },
    }).sort({ orderIndex: 1 }).lean();

    expect(COMPANY_FUNCTION_SEED).toHaveLength(11);
    expect(rows).toHaveLength(11);
    expect(rows.map((row) => row.slug)).toEqual(CANONICAL_COMPANY_FUNCTION_SLUGS);
    expect(rows.every((row) => row.isActive)).toBe(true);
    expect(rows.find((row) => row.slug === "importing-to-india")?.name).toBe("Importing into India");
    expect(rows.find((row) => row.slug === "exporting-from-india")?.name).toBe("Exporting from India");
  });
});
