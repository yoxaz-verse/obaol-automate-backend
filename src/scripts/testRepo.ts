import mongoose from "mongoose";
import { VariantRateModel } from "../database/models/variantRate";
import { getEntityConfig } from "../registry/entities";
// Add other necessary models for populate to work
import "../database/models/productVariant";
import "../database/models/product";
import "../database/models/associate";
import "../database/models/associateCompany";


async function main() {
  await mongoose.connect('mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/oboal');
  console.log("Connected to MongoDB");

  const filterQuery = { isLive: true, isDeleted: { $ne: true } };

  let queryBuilder = VariantRateModel.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(10)
      .skip(0);

  const config = getEntityConfig('variant-rates');
  
  if (config?.relations) {
        const populatePaths: Record<string, any> = {};
        const keys = Object.keys(config.relations).sort((a, b) => a.split('.').length - b.split('.').length);
        for (const path of keys) {
            const parts = path.split('.');
            let current = populatePaths;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { path: part, populate: {} };
                }
                if (i !== parts.length - 1) {
                    current = current[part].populate;
                }
            }
        }
        const convertToMongooseFormat = (obj: Record<string, any>): any[] => {
            return Object.values(obj).map(item => {
                const result: any = { path: item.path };
                const children = convertToMongooseFormat(item.populate);
                if (children.length > 0) result.populate = children;
                return result;
            });
        };
        const populate = convertToMongooseFormat(populatePaths);
        console.log("Populate:", JSON.stringify(populate, null, 2));
        queryBuilder = queryBuilder.populate(populate);
  }

  try {
      const docs = await queryBuilder;
      console.log('Result count:', docs.length);
      if (docs.length > 0) console.log('Successfully found and populated a doc!');
  } catch (err) {
      console.error("Query Error:", err);
  }

  process.exit(0);
}

main().catch(console.error);

