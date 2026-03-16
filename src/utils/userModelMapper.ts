// utils/userModelMapper.ts

import { OperatorModel } from "../database/models/operator";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";

export const getUserModel = (userType: string) => {
  switch (userType) {
    case "Associate":
      return AssociateModel;
    case "Admin":
      return AdminModel;
    case "Operator":
      return OperatorModel;
    default:
      throw new Error(`Unknown userType: ${userType}`);
  }
};
