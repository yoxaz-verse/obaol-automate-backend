import mongoose from "mongoose";
import { MONGODB_URI } from "../config";

const COLLECTION_RENAMES: Array<{ from: string; to: string }> = [
  { from: "employees", to: "operators" },
];

const FIELD_RENAMES: Array<{ collection: string; from: string; to: string }> = [
  { collection: "inquiries", from: "assignedEmployeeId", to: "assignedOperatorId" },
  { collection: "associatecompanies", from: "assignedEmployee", to: "assignedOperator" },
  { collection: "orders", from: "closedByEmployee", to: "closedByOperator" },
  { collection: "operators", from: "mentorEmployee", to: "mentorOperator" },
  { collection: "commissions", from: "employeeId", to: "operatorId" },
  { collection: "researchedcompanies", from: "submittedBy", to: "submittedByOperator" },
];

const run = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongo connection not initialized.");
  }

  for (const rename of COLLECTION_RENAMES) {
    const existing = await db.listCollections({ name: rename.from }).toArray();
    const targetExists = await db.listCollections({ name: rename.to }).toArray();
    if (existing.length === 0) {
      console.log(`[skip] collection ${rename.from} not found`);
      continue;
    }
    if (targetExists.length > 0) {
      console.log(`[skip] target collection ${rename.to} already exists`);
      continue;
    }
    await db.admin().command({ renameCollection: `${db.databaseName}.${rename.from}`, to: `${db.databaseName}.${rename.to}` });
    console.log(`[ok] renamed ${rename.from} -> ${rename.to}`);
  }

  for (const rename of FIELD_RENAMES) {
    const existing = await db.listCollections({ name: rename.collection }).toArray();
    if (existing.length === 0) {
      console.log(`[skip] collection ${rename.collection} not found`);
      continue;
    }
    const result = await db.collection(rename.collection).updateMany(
      { [rename.from]: { $exists: true } },
      { $rename: { [rename.from]: rename.to } }
    );
    console.log(`[ok] ${rename.collection} ${rename.from} -> ${rename.to}`, {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Operator rename migration failed:", error);
  process.exit(1);
});
