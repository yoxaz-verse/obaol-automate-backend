import mongoose from "mongoose";

/**
 * Build a dynamic MongoDB query based on incoming filters
 * @param filters - Filters provided by the frontend
 * @returns Query object for MongoDB
 */
export const buildDynamicQuery = (
  filters: Record<string, any>
): Record<string, any> => {
  const query: any = { isDeleted: false }; // Default to exclude deleted documents

  for (const key in filters) {
    if (!filters.hasOwnProperty(key)) continue;

    const value = filters[key];

    if (key === "assignmentDate" && value.start && value.end) {
      // Handle date range for assignmentDate
      query.assignmentDate = {
        $gte: new Date(value.start),
        $lte: new Date(value.end),
      };
    } else if (typeof value === "string") {
      // Handle string values
      if (mongoose.isValidObjectId(value)) {
        // If the string is a valid MongoDB ObjectId
        query[key] = new mongoose.Types.ObjectId(value);
      } else {
        // Otherwise, treat it as plain text (use $regex for partial matching)
        query[key] = { $regex: value, $options: "i" }; // Case-insensitive match
      }
    } else if (Array.isArray(value)) {
      // Handle array values - Use $in operator for multiselect filters
      query[key] = {
        $in: value.map((item) =>
          mongoose.isValidObjectId(item)
            ? new mongoose.Types.ObjectId(item)
            : item
        ),
      };
    } else if (typeof value === "object" && value !== null) {
      // Handle date ranges and other nested objects
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
