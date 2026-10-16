import { beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  PAST_LISTING_RETENTION_MS,
  pastListingRetentionCutoff,
  recentPastCondition,
} from "../src/services/variantRateFreshnessService";
import { variantRateLifecyclePreWriteHook } from "../src/core/hooks/variantRateLifecycleHook";
import { variantRateMarketplaceQueryHook } from "../src/core/hooks/variantRateMarketplaceQueryHook";
import { ExecutionMode } from "../src/core/types";
import { VariantRateModel } from "../src/database/models/variantRate";
import { CatalogItemModel } from "../src/database/models/catalogItem";
import { DisplayedRateModel } from "../src/database/models/displayedRate";
import { findLatestVariantRatesForProductTable } from "../src/services/variantRateProductTableService";

describe("variant-rate freshness", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");

  beforeEach(async () => {
    await Promise.all([
      VariantRateModel.deleteMany({}),
      CatalogItemModel.deleteMany({}),
      DisplayedRateModel.deleteMany({}),
    ]);
  });

  it("keeps past listings visible for 20 days after unpublishing", () => {
    expect(pastListingRetentionCutoff(now).getTime()).toBe(now.getTime() - PAST_LISTING_RETENTION_MS);
    expect(recentPastCondition(now)).toEqual({
      unpublishedAt: { $gt: pastListingRetentionCutoff(now) },
    });
  });

  it("stamps manual unpublish and clears it when republishing", async () => {
    const offline: any = await variantRateLifecyclePreWriteHook({ isLive: false }, ExecutionMode.UPDATE);
    expect(offline.isLive).toBe(false);
    expect(offline.unpublishedAt).toBeInstanceOf(Date);

    const live: any = await variantRateLifecyclePreWriteHook({ isLive: true }, ExecutionMode.UPDATE);
    expect(live.isLive).toBe(true);
    expect(live.lastLiveDate).toBeInstanceOf(Date);
    expect(live.unpublishedAt).toBeNull();
  });

  it("limits non-admin past marketplace queries but leaves admin history complete", async () => {
    const traderQuery: any = await variantRateMarketplaceQueryHook(
      { view: "marketplace", isLive: false },
      "read",
      undefined,
      { query: { view: "marketplace", isLive: "false" }, user: { role: "Associate" } }
    );
    expect(traderQuery.$and).toEqual(expect.arrayContaining([
      expect.objectContaining({ unpublishedAt: expect.any(Object) }),
    ]));

    const adminQuery: any = await variantRateMarketplaceQueryHook(
      { view: "marketplace", isLive: false },
      "read",
      undefined,
      { query: { view: "marketplace", isLive: "false" }, user: { role: "Admin" } }
    );
    expect(adminQuery).toEqual({ isLive: { $ne: true } });
  });

  it("keeps manually-live listings visible regardless of age", async () => {
    const query: any = await variantRateMarketplaceQueryHook(
      { view: "marketplace", isLive: true },
      "read",
      undefined,
      { query: { view: "marketplace", isLive: "true" }, user: { role: "Associate" } }
    );

    expect(query).toEqual({ isLive: true });
  });

  it("returns only the newest listing per company and exact variant", async () => {
    const companyA = new Types.ObjectId();
    const companyB = new Types.ObjectId();
    const associateId = new Types.ObjectId();
    const variantA = new Types.ObjectId();
    const variantB = new Types.ObjectId();
    const oldId = new Types.ObjectId();
    const newestId = new Types.ObjectId();
    const otherCompanyId = new Types.ObjectId();
    const otherVariantId = new Types.ObjectId();

    await VariantRateModel.collection.insertMany([
      { _id: oldId, rate: 90, productVariant: variantA, associate: associateId, associateCompany: companyA, isLive: true, isDeleted: false, lastLiveDate: new Date("2026-10-01T00:00:00Z"), createdAt: new Date("2026-10-01T00:00:00Z"), updatedAt: new Date("2026-10-01T00:00:00Z") },
      { _id: newestId, rate: 100, productVariant: variantA, associate: associateId, associateCompany: companyA, isLive: false, isDeleted: false, lastLiveDate: new Date("2026-10-10T00:00:00Z"), createdAt: new Date("2026-10-10T00:00:00Z"), updatedAt: new Date("2026-10-10T00:00:00Z") },
      { _id: otherCompanyId, rate: 110, productVariant: variantA, associate: associateId, associateCompany: companyB, isLive: true, isDeleted: false, lastLiveDate: new Date("2026-10-11T00:00:00Z"), createdAt: new Date("2026-10-11T00:00:00Z"), updatedAt: new Date("2026-10-11T00:00:00Z") },
      { _id: otherVariantId, rate: 120, productVariant: variantB, associate: associateId, associateCompany: companyA, isLive: true, isDeleted: false, lastLiveDate: new Date("2026-10-12T00:00:00Z"), createdAt: new Date("2026-10-12T00:00:00Z"), updatedAt: new Date("2026-10-12T00:00:00Z") },
    ] as any);

    const result = await findLatestVariantRatesForProductTable(
      VariantRateModel,
      {},
      { page: 1, limit: 10 },
    );

    expect(result.totalCount).toBe(3);
    expect(result.data.map((row: any) => String(row._id))).toEqual([
      String(otherVariantId),
      String(otherCompanyId),
      String(newestId),
    ]);
  });

  it("groups before live filtering without expiring older live rows", async () => {
    const companyId = new Types.ObjectId();
    const associateId = new Types.ObjectId();
    const hiddenVariant = new Types.ObjectId();
    const freshVariant = new Types.ObjectId();
    const current = new Date("2026-10-12T12:00:00.000Z");

    await VariantRateModel.collection.insertMany([
      { rate: 90, productVariant: hiddenVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(current.getTime() - 1_000), createdAt: new Date(current.getTime() - 1_000), updatedAt: new Date(current.getTime() - 1_000) },
      { rate: 100, productVariant: hiddenVariant, associate: associateId, associateCompany: companyId, isLive: false, isDeleted: false, lastLiveDate: current, createdAt: current, updatedAt: current },
      { rate: 110, productVariant: freshVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date("2026-01-01T00:00:00Z"), createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z") },
    ] as any);

    const live = await findLatestVariantRatesForProductTable(
      VariantRateModel,
      { isLive: true },
      { page: 1, limit: 10 },
      undefined,
      undefined,
      current,
    );

    expect(live.totalCount).toBe(1);
    expect(String(live.data[0].productVariant)).toBe(String(freshVariant));
    expect(live.data[0].__effectiveIsLive).toBe(true);
  });
});
