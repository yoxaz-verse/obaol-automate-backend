import { beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import {
  LISTING_FRESHNESS_MS,
  listingFreshnessCutoff,
  liveFreshnessCondition,
  recentPastCondition,
  expireStaleVariantRates,
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

  it("uses an exact 20 x 24 hour cutoff", () => {
    expect(listingFreshnessCutoff(now).getTime()).toBe(now.getTime() - LISTING_FRESHNESS_MS);
  });

  it("builds live visibility from the most recent available publish timestamp", () => {
    expect(liveFreshnessCondition(now)).toEqual({
      $expr: {
        $gt: [
          { $ifNull: ["$lastLiveDate", { $ifNull: ["$updatedAt", "$createdAt"] }] },
          listingFreshnessCutoff(now),
        ],
      },
    });
  });

  it("keeps past listings visible for 20 days after unpublishing", () => {
    expect(recentPastCondition(now)).toEqual({
      unpublishedAt: { $gt: listingFreshnessCutoff(now) },
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

  it("uses persisted live status for marketplace reads after expiry reconciliation", async () => {
    const query: any = await variantRateMarketplaceQueryHook(
      { view: "marketplace", isLive: true },
      "read",
      undefined,
      { query: { view: "marketplace", isLive: "true" }, user: { role: "Associate" } }
    );

    expect(query).toEqual({ isLive: true });
  });

  it("expires only stale live rows and synchronizes dependent availability", async () => {
    const staleId = new Types.ObjectId();
    const freshId = new Types.ObjectId();
    const associateId = new Types.ObjectId();
    const companyId = new Types.ObjectId();
    const variantId = new Types.ObjectId();
    await VariantRateModel.collection.insertMany([
      { _id: staleId, rate: 100, productVariant: variantId, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(now.getTime() - LISTING_FRESHNESS_MS), createdAt: now, updatedAt: now },
      { _id: freshId, rate: 110, productVariant: variantId, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(now.getTime() - LISTING_FRESHNESS_MS + 1), createdAt: now, updatedAt: now },
    ] as any);
    await CatalogItemModel.collection.insertOne({ associateId, associateCompanyId: companyId, productVariantId: variantId, baseRateId: staleId, margin: 0, finalPrice: 100, isLive: true });
    await DisplayedRateModel.collection.insertOne({ variantRate: staleId, associate: associateId, associateCompany: companyId, isLive: true });

    await expect(expireStaleVariantRates(now)).resolves.toBe(1);
    await expect(VariantRateModel.findById(staleId).lean()).resolves.toMatchObject({ isLive: false, unpublishedAt: now });
    await expect(VariantRateModel.findById(freshId).lean()).resolves.toMatchObject({ isLive: true });
    await expect(CatalogItemModel.findOne({ baseRateId: staleId }).lean()).resolves.toMatchObject({ isLive: false });
    await expect(DisplayedRateModel.findOne({ variantRate: staleId }).lean()).resolves.toMatchObject({ isLive: false });
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

  it("groups before live filtering and evaluates the exact freshness cutoff", async () => {
    const companyId = new Types.ObjectId();
    const associateId = new Types.ObjectId();
    const hiddenVariant = new Types.ObjectId();
    const freshVariant = new Types.ObjectId();
    const expiredVariant = new Types.ObjectId();
    const current = new Date("2026-10-12T12:00:00.000Z");
    const cutoff = listingFreshnessCutoff(current);
    const boundaryVariant = new Types.ObjectId();

    await VariantRateModel.collection.insertMany([
      { rate: 90, productVariant: hiddenVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(current.getTime() - 1_000), createdAt: new Date(current.getTime() - 1_000), updatedAt: new Date(current.getTime() - 1_000) },
      { rate: 100, productVariant: hiddenVariant, associate: associateId, associateCompany: companyId, isLive: false, isDeleted: false, lastLiveDate: current, createdAt: current, updatedAt: current },
      { rate: 110, productVariant: freshVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(cutoff.getTime() + 5_000), createdAt: current, updatedAt: current },
      { rate: 115, productVariant: boundaryVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: cutoff, createdAt: current, updatedAt: current },
      { rate: 120, productVariant: expiredVariant, associate: associateId, associateCompany: companyId, isLive: true, isDeleted: false, lastLiveDate: new Date(cutoff.getTime() - 5_000), createdAt: current, updatedAt: current },
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
