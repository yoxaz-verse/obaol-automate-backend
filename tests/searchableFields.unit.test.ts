import mongoose, { Schema } from "mongoose";
import { buildRegexSearchTerms, getRegexSearchableFields } from "../src/core/engine/searchableFields";

const createModel = (namePrefix: string, schema: Schema) => {
  const modelName = `${namePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return mongoose.model(modelName, schema);
};

describe("searchableFields helper", () => {
  it("includes only regex-safe fields (string/mixed) and excludes number/objectId", () => {
    const model = createModel(
      "SearchableFieldsSafe",
      new Schema({
        name: String,
        notes: Schema.Types.Mixed,
        code: Number,
        owner: Schema.Types.ObjectId,
      })
    );

    const safeFields = getRegexSearchableFields(model, ["name", "notes", "code", "owner", "missing"]);
    expect(safeFields).toEqual(["name", "notes"]);
  });

  it("supports nested schema paths and skips non-string nested paths", () => {
    const model = createModel(
      "SearchableFieldsNested",
      new Schema({
        profile: {
          displayName: String,
          score: Number,
        },
      })
    );

    const safeFields = getRegexSearchableFields(model, ["profile.displayName", "profile.score"]);
    expect(safeFields).toEqual(["profile.displayName"]);
  });

  it("returns empty regex terms when all configured fields are non-string", () => {
    const model = createModel(
      "SearchableFieldsNone",
      new Schema({
        code: Number,
        owner: Schema.Types.ObjectId,
        isActive: Boolean,
      })
    );

    const regexTerms = buildRegexSearchTerms(model, ["code", "owner", "isActive"], "91");
    expect(regexTerms).toEqual([]);
  });
});
