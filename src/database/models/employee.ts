import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface IEmployee extends mongoose.Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  state: string;
  joiningDate: string;
  jobType: string;
  jobRole: string;
  workingHours: string;
  languageKnown: string;
  isActive: boolean;
  isDeleted: boolean;
  role: string; // Assign default role
  // comparePassword(candidatePassword: string): Promise<boolean>; // Password comparison
}

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    joiningDate: { type: String, required: true },
    jobRole: { type: String, required: true },
    jobType: { type: String, required: true },
    workingHours: { type: String, required: true },
    languageKnown: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    role: { type: String, default: "team" }, // Assign default role
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// employeeSchema.pre("save", async function (next) {
//   const admin = this as ITeam;
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
// employeeSchema.methods.comparePassword = async function (
//   candidatePassword: string
// ) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

export const EmployeeModel = mongoose.model<IEmployee>(
  "Employee",
  employeeSchema
);
