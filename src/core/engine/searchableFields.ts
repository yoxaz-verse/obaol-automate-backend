import { Model } from "mongoose";

const REGEX_SAFE_SCHEMA_TYPES = new Set(["String", "Mixed"]);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isRegexSafeSchemaType = (schemaType: any): boolean => {
  if (!schemaType) return false;

  const instance = String(schemaType.instance || "");
  if (REGEX_SAFE_SCHEMA_TYPES.has(instance)) return true;

  if (instance === "Array") {
    const casterInstance = String(schemaType?.caster?.instance || "");
    return REGEX_SAFE_SCHEMA_TYPES.has(casterInstance);
  }

  return false;
};

export const getRegexSearchableFields = (
  model: Model<any> | undefined,
  fields: string[] | undefined
): string[] => {
  if (!model || !Array.isArray(fields) || fields.length === 0) return [];

  return fields.filter((field) => {
    if (!field || typeof field !== "string") return false;
    const schemaType = model.schema.path(field);
    return isRegexSafeSchemaType(schemaType);
  });
};

export const buildRegexSearchTerms = (
  model: Model<any> | undefined,
  fields: string[] | undefined,
  searchValue: unknown
): any[] => {
  const value = String(searchValue || "").trim();
  if (!value) return [];

  const safeFields = getRegexSearchableFields(model, fields);
  if (safeFields.length === 0) return [];

  const escaped = escapeRegex(value);
  return safeFields.map((field) => ({
    [field]: { $regex: escaped, $options: "i" },
  }));
};
