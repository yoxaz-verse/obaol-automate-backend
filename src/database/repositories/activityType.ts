import { Request } from "express";
import { ActivityTypeModel } from "../models/activityType";
import {
  IActivityType,
  ICreateActivityType,
  IUpdateActivityType,
} from "../../interfaces/activityType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class ActivityTypeRepository {
  public async getActivityTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IActivityType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const activityTypesDoc = await ActivityTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const activityTypes = activityTypesDoc.map(
        (doc) => doc.toObject() as IActivityType
      );

      const totalCount = await ActivityTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: activityTypes,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypes");
      throw error;
    }
  }

  public async getActivityTypeById(
    req: Request,
    id: string
  ): Promise<IActivityType> {
    try {
      const activityTypeDoc = await ActivityTypeModel.findById(id);

      if (!activityTypeDoc) {
        throw new Error("ActivityType not found");
      }

      return activityTypeDoc.toObject() as IActivityType;
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-getActivityTypeById");
      throw error;
    }
  }

  public async createActivityType(
    req: Request,
    activityTypeData: ICreateActivityType
  ): Promise<IActivityType> {
    try {
      const newActivityType = await ActivityTypeModel.create(activityTypeData);
      return newActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-createActivityType");
      throw error;
    }
  }

  public async updateActivityType(
    req: Request,
    id: string,
    activityTypeData: Partial<IUpdateActivityType>
  ): Promise<IActivityType> {
    try {
      const updatedActivityType = await ActivityTypeModel.findByIdAndUpdate(
        id,
        activityTypeData,
        { new: true }
      );
      if (!updatedActivityType) {
        throw new Error("Failed to update ActivityType");
      }
      return updatedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-updateActivityType");
      throw error;
    }
  }

  public async deleteActivityType(
    req: Request,
    id: string
  ): Promise<IActivityType> {
    try {
      const deletedActivityType = await ActivityTypeModel.findByIdAndDelete(id);
      if (!deletedActivityType) {
        throw new Error("Failed to delete ActivityType");
      }
      return deletedActivityType.toObject();
    } catch (error) {
      await logError(error, req, "ActivityTypeRepository-deleteActivityType");
      throw error;
    }
  }
}

export default ActivityTypeRepository;
