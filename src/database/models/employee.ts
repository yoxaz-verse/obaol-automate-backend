import mongoose from "mongoose";
import { passwordPlugin } from "./plugins/password.plugin";

interface ITime {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

interface IWorkingHour {
  start: ITime;
  end: ITime;
}

interface IEmployee extends mongoose.Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  district?: mongoose.Types.ObjectId;
  state?: mongoose.Types.ObjectId;
  joiningDate: Date;
  jobType: mongoose.Types.ObjectId;
  jobRole: mongoose.Types.ObjectId;
  workingHours: IWorkingHour[];
  languageKnown: mongoose.Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  role: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const timeSchema = new mongoose.Schema(
  {
    hour: { type: Number, required: true },
    minute: { type: Number, required: true },
    second: { type: Number, required: true },
    millisecond: { type: Number, required: true },
  },
  { _id: false }
);


const workingHourSchema = new mongoose.Schema(
  {
    start: { type: timeSchema, required: true },
    end: { type: timeSchema, required: true },
  },
  { _id: false }
);


const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    district: { type: mongoose.Types.ObjectId, ref: "District" },
    state: { type: mongoose.Types.ObjectId, ref: "State" },
    joiningDate: { type: Date, required: true },
    jobRole: { type: mongoose.Types.ObjectId, ref: "JobRole" },
    jobType: { type: mongoose.Types.ObjectId, ref: "JobType" },

    // ✅ Array of start/end time objects
    workingHours: { type: [workingHourSchema], required: true },

    // ✅ Array of ObjectIds
    languageKnown: [{ type: mongoose.Types.ObjectId, ref: "Language" }],

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    role: { type: String, default: "team" },
  },
  {
    timestamps: true,
  }
);

employeeSchema.plugin(passwordPlugin);

export const EmployeeModel = mongoose.model<IEmployee>(
  "Employee",
  employeeSchema
);
