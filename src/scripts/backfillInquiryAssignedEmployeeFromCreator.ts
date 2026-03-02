import dotenv from "dotenv";
import mongoose from "mongoose";
import { InquiryModel } from "../database/models/enquiry";
import { EmployeeModel } from "../database/models/employee";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const rows = await InquiryModel.find({
      $or: [{ assignedEmployeeId: null }, { assignedEmployeeId: { $exists: false } }],
      createdBy: { $exists: true, $ne: null },
    })
      .select("_id createdBy assignedEmployeeId")
      .lean();

    let updated = 0;
    let skipped = 0;

    for (const row of rows as any[]) {
      const creatorId = String(row?.createdBy || "");
      if (!creatorId || !mongoose.Types.ObjectId.isValid(creatorId)) {
        skipped++;
        continue;
      }

      const employeeExists = await EmployeeModel.exists({ _id: creatorId, isDeleted: { $ne: true } });
      if (!employeeExists) {
        skipped++;
        continue;
      }

      await InquiryModel.updateOne(
        { _id: row._id },
        { $set: { assignedEmployeeId: creatorId } }
      );
      updated++;
    }

    console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}, total scanned: ${rows.length}`);
  } catch (error: any) {
    console.error("Failed to backfill inquiry assignees:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

