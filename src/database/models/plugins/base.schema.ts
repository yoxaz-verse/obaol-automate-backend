import { Schema } from "mongoose";

export const baseSchemaPlugin = (schema: Schema) => {
    schema.add({
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    });

    schema.set("timestamps", true);

    // Ensure toObject and toJSON include virtuals and are clean
    schema.set("toObject", {
        virtuals: true,
        transform: (doc, ret) => {
            const result = { ...ret };
            delete (result as any).__v;
            return result;
        },
    });

    schema.set("toJSON", {
        virtuals: true,
        transform: (doc, ret) => {
            const result = { ...ret };
            delete (result as any).__v;
            return result;
        },
    });
};
