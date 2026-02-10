import { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export const passwordPlugin = (schema: Schema) => {
    // Hash password before saving
    schema.pre("save", async function (next) {
        const user = this as any;

        // Only hash the password if it has been modified (or is new)
        if (!user.isModified("password")) {
            return next();
        }

        try {
            const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);
            const salt = await bcrypt.genSalt(saltRounds);
            const hash = await bcrypt.hash(user.password, salt);
            user.password = hash;
            next();
        } catch (err: any) {
            return next(err);
        }
    });

    // Method to compare passwords
    schema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
        return await bcrypt.compare(candidatePassword, this.password);
    };
};
