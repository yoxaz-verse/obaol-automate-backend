import mongoose from "mongoose";
import { CompanyFunctionModel } from "../database/models/companyFunction";

const ALLOWED_SLUGS = [
  "sourcing",
  "packaging",
  "testing",
  "warehouse-storage",
  "finance-risk",
  "importing-distribution",
  "freight-forwarding",
  "inland-logistics",
];

const run = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DB_URI ||
    "";

  if (!mongoUri) {
    throw new Error("Missing Mongo connection string.");
  }

  await mongoose.connect(mongoUri);
  const result = await CompanyFunctionModel.updateMany(
    { slug: { $nin: ALLOWED_SLUGS } },
    { $set: { isActive: false } }
  );
  // eslint-disable-next-line no-console
  console.log(`Deactivated ${result.modifiedCount} legacy company functions.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
