import mongoose from "mongoose";

/**
 * Build a dynamic MongoDB query based on incoming filters
 * @param filters - Filters provided by the frontend
 * @returns Query object for MongoDB
 */
export const buildDynamicQuery = (
  filters: Record<string, any>
): Record<string, any> => {
  const query: any = {};

  for (const key in filters) {
    if (!filters.hasOwnProperty(key)) continue;

    const value = filters[key];

    if (key === "assignmentDate" && value.start && value.end) {
      query.assignmentDate = {
        $gte: new Date(value.start),
        $lte: new Date(value.end),
      };
    } else if (typeof value === "string") {
      if (mongoose.isValidObjectId(value)) {
        query[key] = new mongoose.Types.ObjectId(value);
      } else if (value === "true" || value === "false") {
        // Handle boolean strings explicitly
        query[key] = value === "true";
      } else {
        query[key] = { $regex: value, $options: "i" };
      }
    } else if (typeof value === "boolean") {
      // Direct boolean handling
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

      if (value.start) {
        nestedQuery.$gte = new Date(value.start);
      }
      if (value.end) {
        nestedQuery.$lte = new Date(value.end);
      }

      if (Object.keys(nestedQuery).length > 0) {
        query[key] = nestedQuery;
      }
    }
  }

  return query;
};
