// utils/userModelMapper.ts

import { EmployeeModel } from "../database/models/employee";
import { AdminModel } from "../database/models/admin";
import { AssociateModel } from "../database/models/associate";
import { CustomerModel } from "../database/models/customer";

export const getUserModel = (userType: string) => {
  switch (userType) {
    case "Associate":
      return AssociateModel;
    case "Customer":
      return CustomerModel;
    case "Admin":
      return AdminModel;
    case "Employee":
      return EmployeeModel;
    default:
      throw new Error(`Unknown userType: ${userType}`);
  }
};
