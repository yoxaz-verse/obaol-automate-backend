import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "../database/connection";
import { AssociateCompanyModel } from "../database/models/associateCompany";

async function migrate() {
    try {
        await connectDB();
        console.log("Connected to database. Starting migration...");

        // Find companies that don't have subdomain or slug
        const companies = await AssociateCompanyModel.find({
            $or: [
                { subdomain: { $exists: false } },
                { subdomain: "" },
                { slug: { $exists: false } },
                { slug: "" }
            ]
        });

        console.log(`Found ${companies.length} companies to update.`);

        for (const company of companies) {
            try {
                // Just calling save() will trigger the pre-save hook we just added
                await company.save();
                console.log(`Updated: ${company.name} -> ${company.subdomain} (Slug: ${company.slug})`);
            } catch (err: any) {
                console.error(`Failed to update ${company.name}:`, err.message);
            }
        }

        console.log("Migration completed.");
        process.exit(0);
    } catch (error) {
        console.error("Migration fatal error:", error);
        process.exit(1);
    }
}

migrate();
