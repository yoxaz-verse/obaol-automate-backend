import dotenv from "dotenv";
import mongoose from "mongoose";
import { InquiryModel } from "../database/models/enquiry";
import { OrderModel } from "../database/models/order";
import { AssociateModel } from "../database/models/associate";
import { AssociateCompanyModel } from "../database/models/associateCompany";

dotenv.config();

async function resolveCompanyOperatorId(companyId?: string) {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) return null;
  const company = await AssociateCompanyModel.findById(companyId)
    .select("assignedOperator")
    .lean();
  const operatorId = String((company as any)?.assignedOperator || "").trim();
  return operatorId && mongoose.Types.ObjectId.isValid(operatorId) ? operatorId : null;
}

async function resolveSellerCompanyIdFromAssociate(associateId?: string) {
  if (!associateId || !mongoose.Types.ObjectId.isValid(associateId)) return null;
  const associate = await AssociateModel.findById(associateId)
    .select("associateCompany")
    .lean();
  const companyId = String((associate as any)?.associateCompany || "").trim();
  return companyId && mongoose.Types.ObjectId.isValid(companyId) ? companyId : null;
}

async function backfillEnquiries() {
  const rows = await InquiryModel.find({
    $or: [{ supplierOperatorId: null }, { supplierOperatorId: { $exists: false } }],
  })
    .select("_id sellerAssociateId supplierOperatorId")
    .lean();

  let updated = 0;
  let skipped = 0;

  for (const row of rows as any[]) {
    const sellerAssociateId = String(row?.sellerAssociateId || "").trim();
    const companyId = await resolveSellerCompanyIdFromAssociate(sellerAssociateId);
    const operatorId = await resolveCompanyOperatorId(companyId || undefined);
    if (!operatorId) {
      skipped++;
      continue;
    }

    await InquiryModel.updateOne(
      { _id: row._id },
      { $set: { supplierOperatorId: operatorId } }
    );
    updated++;
  }

  console.log(
    `Enquiry backfill complete. Updated: ${updated}, skipped: ${skipped}, total scanned: ${rows.length}`
  );
}

async function backfillOrders() {
  const rows = await OrderModel.find({
    $or: [{ supplierOperatorId: null }, { supplierOperatorId: { $exists: false } }],
  })
    .select("_id sellerAssociateId associateCompanyId supplierOperatorId")
    .lean();

  let updated = 0;
  let skipped = 0;

  for (const row of rows as any[]) {
    let companyId = String(row?.associateCompanyId || "").trim();
    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      const sellerAssociateId = String(row?.sellerAssociateId || "").trim();
      companyId = (await resolveSellerCompanyIdFromAssociate(sellerAssociateId)) || "";
    }

    const operatorId = await resolveCompanyOperatorId(companyId || undefined);
    if (!operatorId) {
      skipped++;
      continue;
    }

    await OrderModel.updateOne(
      { _id: row._id },
      { $set: { supplierOperatorId: operatorId } }
    );
    updated++;
  }

  console.log(
    `Order backfill complete. Updated: ${updated}, skipped: ${skipped}, total scanned: ${rows.length}`
  );
}

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    await backfillEnquiries();
    await backfillOrders();
  } catch (error: any) {
    console.error("Failed to backfill supplier operators:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
