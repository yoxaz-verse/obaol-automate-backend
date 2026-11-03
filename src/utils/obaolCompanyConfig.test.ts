import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configValue: null as string | null,
  companies: new Map<string, any>(),
}));

vi.mock("../database/models/systemConfig", () => ({
  SystemConfigModel: {
    findOne: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(mocks.configValue ? { value: mocks.configValue } : null) })),
  },
}));

vi.mock("../database/models/associateCompany", () => ({
  AssociateCompanyModel: {
    findById: vi.fn((id: unknown) => ({
      select: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(mocks.companies.get(String(id)) || null) })),
    })),
  },
}));

import { resolveObaolCompany } from "./obaolCompanyConfig";

const databaseId = "507f1f77bcf86cd799439011";
const environmentId = "507f191e810c19729de860ea";

describe("OBAOL company configuration resolver", () => {
  beforeEach(() => {
    mocks.configValue = null;
    mocks.companies.clear();
    delete process.env.OBAOL_COMPANY_ID;
  });

  afterEach(() => delete process.env.OBAOL_COMPANY_ID);

  it("uses a valid database configuration", async () => {
    mocks.configValue = databaseId;
    mocks.companies.set(databaseId, { _id: databaseId, name: "OBAOL" });
    await expect(resolveObaolCompany()).resolves.toMatchObject({ status: "CONFIGURED", source: "DATABASE" });
  });

  it("reports a missing configuration", async () => {
    await expect(resolveObaolCompany()).resolves.toEqual({ status: "MISSING", companyId: null, company: null, source: null });
  });

  it("reports malformed database IDs as invalid", async () => {
    mocks.configValue = "not-an-object-id";
    await expect(resolveObaolCompany()).resolves.toMatchObject({ status: "INVALID", source: "DATABASE" });
  });

  it("reports deleted database companies as invalid", async () => {
    mocks.configValue = databaseId;
    await expect(resolveObaolCompany()).resolves.toMatchObject({ status: "INVALID", source: "DATABASE" });
  });

  it("uses a valid environment fallback when the database setting is absent", async () => {
    process.env.OBAOL_COMPANY_ID = environmentId;
    mocks.companies.set(environmentId, { _id: environmentId, name: "Environment OBAOL" });
    await expect(resolveObaolCompany()).resolves.toMatchObject({ status: "CONFIGURED", source: "ENVIRONMENT" });
  });

  it("keeps the database setting canonical when an environment company also exists", async () => {
    mocks.configValue = databaseId;
    process.env.OBAOL_COMPANY_ID = environmentId;
    mocks.companies.set(databaseId, { _id: databaseId, name: "Database OBAOL" });
    mocks.companies.set(environmentId, { _id: environmentId, name: "Environment OBAOL" });
    const result = await resolveObaolCompany();
    expect(result).toMatchObject({ status: "CONFIGURED", source: "DATABASE", company: { name: "Database OBAOL" } });
  });
});
