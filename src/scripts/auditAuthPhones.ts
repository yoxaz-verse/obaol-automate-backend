import mongoose from "mongoose";
import { AssociateModel } from "../database/models/associate";
import { OperatorModel } from "../database/models/operator";

async function main() {
  await mongoose.connect(String(process.env.MONGODB_URI || ""));
  const [associates, operators] = await Promise.all([
    AssociateModel.find({ isDeleted: { $ne: true } }).select("_id email phone").lean(),
    OperatorModel.find({ isDeleted: { $ne: true } }).select("_id email phone").lean(),
  ]);
  const rows = [...associates.map((row: any) => ({ role: "Associate", ...row })), ...operators.map((row: any) => ({ role: "Operator", ...row }))];
  const grouped = new Map<string, any[]>();
  const invalid: any[] = [];
  for (const row of rows) {
    const phone = String(row.phone || "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) invalid.push({ role: row.role, id: String(row._id), email: row.email, phone });
    const values = grouped.get(phone) || [];
    values.push({ role: row.role, id: String(row._id), email: row.email });
    grouped.set(phone, values);
  }
  const duplicates = [...grouped.entries()].filter(([phone, values]) => Boolean(phone) && values.length > 1).map(([phone, accounts]) => ({ phone, accounts }));
  console.log(JSON.stringify({ checked: rows.length, invalid, duplicates }, null, 2));
  await mongoose.disconnect();
  if (invalid.length || duplicates.length) process.exitCode = 2;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
