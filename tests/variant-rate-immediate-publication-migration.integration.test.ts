import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { VariantRateModel } from "../src/database/models/variantRate";
import { migrateVariantRateImmediatePublication } from "../src/scripts/migrateVariantRateImmediatePublication";

describe("variant-rate immediate-publication migration", () => {
  it("approves pending rates, preserves their live state, and keeps rejected rates offline idempotently", async () => {
    const now = new Date("2026-10-16T12:00:00.000Z");
    const common = {
      rate: 100,
      productVariant: new mongoose.Types.ObjectId(),
      associate: new mongoose.Types.ObjectId(),
      associateCompany: new mongoose.Types.ObjectId(),
      isDeleted: false,
    };
    const inserted = await VariantRateModel.collection.insertMany([
      { ...common, approvalStatus: "PENDING_REVIEW", isLive: true, approvalRequestedAt: new Date(), createdAt: now, updatedAt: now },
      { ...common, approvalStatus: "PENDING_REVIEW", isLive: false, approvalRequestedAt: new Date(), createdAt: now, updatedAt: now },
      { ...common, approvalStatus: "REJECTED", isLive: true, unpublishedAt: null, createdAt: now, updatedAt: now },
    ] as any);

    await expect(migrateVariantRateImmediatePublication(now)).resolves.toEqual({ approved: 2, rejectedForcedOffline: 1 });
    const [live, offline, rejected] = await Promise.all([0, 1, 2].map((index) => VariantRateModel.findById(inserted.insertedIds[index]).lean()));
    expect(live).toMatchObject({ approvalStatus: "APPROVED", isLive: true, approvalRequestedAt: null, reviewNotes: "" });
    expect(offline).toMatchObject({ approvalStatus: "APPROVED", isLive: false, approvalRequestedAt: null, reviewNotes: "" });
    expect(rejected).toMatchObject({ approvalStatus: "REJECTED", isLive: false, unpublishedAt: now });
    await expect(migrateVariantRateImmediatePublication(new Date(now.getTime() + 1000))).resolves.toEqual({ approved: 0, rejectedForcedOffline: 0 });
  });
});
