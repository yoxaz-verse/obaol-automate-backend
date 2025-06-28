import mongoose from "mongoose";

export const buildDynamicQuery = (
  filters: Record<string, any>
): Record<string, any> => {
  const query: any = {};

  for (const key in filters) {
    if (!filters.hasOwnProperty(key)) continue;

    const value = filters[key];

    // ✅ Skip empty strings and nulls
    if (value === "" || value === null || value === undefined) continue;

    if (key === "assignmentDate" && value.start && value.end) {
      query.assignmentDate = {
        $gte: new Date(value.start),
        $lte: new Date(value.end),
      };
    } else if (typeof value === "string") {
      if (mongoose.isValidObjectId(value)) {
        query[key] = new mongoose.Types.ObjectId(value);
      } else if (value === "true" || value === "false") {
        query[key] = value === "true";
      } else {
        query[key] = { $regex: value, $options: "i" };
      }
    } else if (typeof value === "boolean") {
      query[key] = value;
    } else if (Array.isArray(value)) {
      query[key] = {
        $in: value.map((item) =>
          mongoose.isValidObjectId(item)
            ? new mongoose.Types.ObjectId(item)
            : item
        ),
      };
    } else if (typeof value === "object" && value !== null) {
      const nestedQuery: any = {};
      if (value.start) nestedQuery.$gte = new Date(value.start);
      if (value.end) nestedQuery.$lte = new Date(value.end);
      if (Object.keys(nestedQuery).length > 0) {
        query[key] = nestedQuery;
      }
    }
  }

  return query;
};
