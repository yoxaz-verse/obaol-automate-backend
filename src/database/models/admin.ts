import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface IAdmin extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  refreshToken?: string;
  role: string, // Assign default role
  // comparePassword(candidatePassword: string): Promise<boolean>; // Password comparison
}

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    refreshToken: { type: String },
    role: { type: String, default: "admin" }, // Assign default role
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// adminSchema.pre("save", async function (next) {
//   const admin = this as IAdmin;
//   if (!admin.isModified("password")) return next();k

//   try {
//     const salt = await bcrypt.genSalt(12);
//     admin.password = await bcrypt.hash(admin.password, salt);
//     next();
//   } catch (err) {
//     next();
//   }
// });

// Password comparison method
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);
