import mongoose from "mongoose";
import { AssociateModel } from "../../src/database/models/associate";
import { OperatorModel } from "../../src/database/models/operator";

const uniqueSuffix = () => new mongoose.Types.ObjectId().toHexString();

export const createAssociate = async (overrides: Record<string, any> = {}) => {
  const suffix = uniqueSuffix();
  const data = {
    name: `Associate ${suffix}`,
    email: `associate.${suffix}@example.com`,
    phone: "+919999000001",
    password: "Passw0rd!",
    isActive: true,
    isDeleted: false,
    onboardingComplete: true,
    registrationStatus: "APPROVED",
    ...overrides,
  };

  return AssociateModel.create(data);
};

export const createOperator = async (overrides: Record<string, any> = {}) => {
  const suffix = uniqueSuffix();
  const data = {
    name: `Operator ${suffix}`,
    email: `operator.${suffix}@example.com`,
    phone: "+919999000002",
    address: "Test Address",
    password: "Passw0rd!",
    isActive: true,
    isDeleted: false,
    onboardingComplete: true,
    registrationStatus: "APPROVED",
    jobRole: new mongoose.Types.ObjectId(),
    jobType: new mongoose.Types.ObjectId(),
    languageKnown: [],
    ...overrides,
  };

  return OperatorModel.create(data);
};
