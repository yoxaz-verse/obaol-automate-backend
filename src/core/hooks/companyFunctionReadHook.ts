import { CompanySubFunctionModel } from "../../database/models/companySubFunction";

export const companyFunctionReadHook = async (rows: any[]) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ids = rows.map((r: any) => r?._id).filter(Boolean);
  const counts = await CompanySubFunctionModel.aggregate([
    { $match: { functionId: { $in: ids } } },
    { $group: { _id: "$functionId", count: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((x: any) => [String(x._id), Number(x.count || 0)]));
  return rows.map((row: any) => ({
    ...row,
    subFunctionCount: byId.get(String(row?._id || "")) || 0,
  }));
};
