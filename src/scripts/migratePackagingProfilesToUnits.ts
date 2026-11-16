import mongoose from "mongoose";
import { MONGODB_URI } from "../config";
import { ServiceProviderProfileModel } from "../database/models/serviceProviderProfile";

export async function migratePackagingProfilesToUnits() {
  const collection = ServiceProviderProfileModel.collection;
  const indexes = await collection.indexes();
  const legacy = indexes.find((index) => index.unique && JSON.stringify(index.key) === JSON.stringify({ department: 1, companyId: 1 }));
  if (legacy?.name) await collection.dropIndex(legacy.name);
  await ServiceProviderProfileModel.updateMany({ department: "PACKAGING", $or: [{ unitKey: { $exists: false } }, { unitKey: "" }, { unitKey: null }] }, [{ $set: { unitKey: "primary", legacyProfileId: "$_id", statusHistory: { $cond: [{ $gt: [{ $size: { $ifNull: ["$statusHistory", []] } }, 0] }, "$statusHistory", [{ status: "$status", at: { $ifNull: ["$updatedAt", "$$NOW"] }, note: "Migrated from company packaging profile" }]] } } }]);
  await collection.createIndex({ department: 1, companyId: 1, unitKey: 1 }, { unique: true, name: "department_1_companyId_1_unitKey_1" });
}

if (require.main === module) mongoose.connect(MONGODB_URI).then(migratePackagingProfilesToUnits).then(() => mongoose.disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
