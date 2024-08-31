import { Request } from "express";
import { LocationTypeModel } from "../models/locationType";
import {
  ILocationType,
  ICreateLocationType,
  IUpdateLocationType,
} from "../../interfaces/locationType";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationTypeRepository {
  public async getLocationTypes(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocationType[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const locationTypes = await LocationTypeModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await LocationTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: locationTypes as ILocationType[],
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypes");
      throw error;
    }
  }

  public async getLocationTypeById(
    req: Request,
    id: string
  ): Promise<ILocationType> {
    try {
      const locationType = await LocationTypeModel.findById(id).lean();
      if (!locationType) {
        throw new Error("Location Type not found");
      }
      return locationType as ILocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypeById");
      throw error;
    }
  }

  public async createLocationType(
    req: Request,
    locationTypeData: ICreateLocationType
  ): Promise<ILocationType> {
    try {
      const newLocationType = await LocationTypeModel.create(locationTypeData);
      return newLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-createLocationType");
      throw error;
    }
  }

  public async updateLocationType(
    req: Request,
    id: string,
    locationTypeData: Partial<IUpdateLocationType>
  ): Promise<ILocationType> {
    try {
      const updatedLocationType = await LocationTypeModel.findByIdAndUpdate(
        id,
        locationTypeData,
        {
          new: true,
        }
      );
      if (!updatedLocationType) {
        throw new Error("Failed to update location type");
      }
      return updatedLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-updateLocationType");
      throw error;
    }
  }

  public async deleteLocationType(
    req: Request,
    id: string
  ): Promise<ILocationType> {
    try {
      const deletedLocationType = await LocationTypeModel.findByIdAndDelete(id);
      if (!deletedLocationType) {
        throw new Error("Failed to delete location type");
      }
      return deletedLocationType.toObject();
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-deleteLocationType");
      throw error;
    }
  }
}

export default LocationTypeRepository;
