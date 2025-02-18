import { Types } from "mongoose";

/**
 * Convert changed fields by replacing IDs with actual names
 * and only logging fields that have changed.
 *
 * @param newData - The new data submitted.
 * @param previousData - The existing data before the update.
 * @param fieldModelMapping - An object mapping fields to their corresponding Mongoose models.
 * @returns Array of changed fields with their old and new values.
 */
export async function convertChangedFields(
  newData: any,
  previousData: any,
  fieldModelMapping: { [key: string]: any }
) {
  const changedFields: { field: string; oldValue: string; newValue: string }[] =
    [];

  for (const key of Object.keys(newData)) {
    const newValue = newData[key];
    const oldValue = previousData[key];

    // Skip unchanged fields
    if (JSON.stringify(newValue) === JSON.stringify(oldValue)) continue;

    // Initialize display values
    let displayOldValue = oldValue;
    let displayNewValue = newValue;

    // Check if the field is a reference to another model
    if (fieldModelMapping[key]) {
      const model = fieldModelMapping[key];

      // Handle single ID references
      if (Types.ObjectId.isValid(newValue)) {
        const [newRecord, oldRecord] = await Promise.all([
          model.findById(newValue).lean(),
          model.findById(oldValue).lean(),
        ]);

        displayOldValue = oldRecord ? oldRecord.name || "Unknown" : "N/A";
        displayNewValue = newRecord ? newRecord.name || "Unknown" : "N/A";
      }
      // Handle array of ID references
      else if (Array.isArray(newValue)) {
        const [newRecords, oldRecords] = await Promise.all([
          model.find({ _id: { $in: newValue } }).lean(),
          model.find({ _id: { $in: oldValue } }).lean(),
        ]);

        displayOldValue =
          oldRecords.map((r: any) => r.name).join(", ") || "N/A";
        displayNewValue =
          newRecords.map((r: any) => r.name).join(", ") || "N/A";
      }
    }

    // Add the changed field to the array
    changedFields.push({
      field: key,
      oldValue: displayOldValue || "N/A",
      newValue: displayNewValue || "N/A",
    });
  }

  return changedFields;
}
