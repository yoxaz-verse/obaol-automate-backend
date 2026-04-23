import { Types } from "mongoose";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { OperatorHierarchyService } from "../../services/operatorHierarchy.service";

type OperatorCompanyScope = {
  operatorIds: string[];
  companyIds: Types.ObjectId[];
  companyIdSet: Set<string>;
};

const toUniqueIds = (ids: string[]) => Array.from(new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)));

export const getOperatorCompanyScope = async (operatorId: string): Promise<OperatorCompanyScope> => {
  const baseOperatorId = String(operatorId || "").trim();
  if (!baseOperatorId) {
    return { operatorIds: [], companyIds: [], companyIdSet: new Set<string>() };
  }

  const downlineIds = await OperatorHierarchyService.getDownlineIds(baseOperatorId);
  const operatorIds = toUniqueIds([baseOperatorId, ...(downlineIds || [])]);
  const operatorObjectIds = operatorIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (!operatorObjectIds.length) {
    return { operatorIds, companyIds: [], companyIdSet: new Set<string>() };
  }

  const companyRows = await AssociateCompanyModel.find({
    assignedOperator: { $in: operatorObjectIds },
  })
    .select("_id")
    .lean();

  const companyIds = companyRows
    .map((row: any) => row?._id)
    .filter(Boolean) as Types.ObjectId[];
  const companyIdSet = new Set(companyIds.map((companyId) => String(companyId)));

  return { operatorIds, companyIds, companyIdSet };
};
