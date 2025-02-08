import { Request } from "express";
import { LocationTypeModel } from "../models/locationType";
import {} from "../../interfaces/locationType";
import { logError } from "../../utils/errorLogger";
import { ILocationType } from "../../interfaces/locationType";

class LocationTypeRepository {
  public async getLocationTypes(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: ILocationType[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await LocationTypeModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const locationTypes = await LocationTypeModel.find(query);

      return { data: locationTypes, totalCount, currentPage, totalPages };
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
      const locationTypeDoc = await LocationTypeModel.findOne({
        _id: id,
      });

      if (!locationTypeDoc) {
        throw new Error("Location Type not found");
      }

      return locationTypeDoc;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-getLocationTypeById");
      throw error;
    }
  }

  public async createLocationType(
    req: Request,
    locationTypeData: any
  ): Promise<ILocationType> {
    try {
      console.log(locationTypeData);

      const newLocationType = await LocationTypeModel.create(locationTypeData);
      return newLocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-createLocationType");
      throw error;
    }
  }

  public async updateLocationType(
    req: Request,
    id: string,
    locationTypeData: Partial<ILocationType>
  ): Promise<ILocationType> {
    try {
      const updatedLocationType = await LocationTypeModel.findOneAndUpdate(
        { _id: id },
        locationTypeData,
        { new: true }
      );
      if (!updatedLocationType) {
        throw new Error("Failed to update Location Type");
      }
      return updatedLocationType;
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
      const deletedLocationType = await LocationTypeModel.findByIdAndDelete({
        _id: id,
      });
      if (!deletedLocationType) {
        throw new Error("Failed to delete Location Type");
      }
      return deletedLocationType;
    } catch (error) {
      await logError(error, req, "LocationTypeRepository-deleteLocationType");
      throw error;
    }
  }
}

export default LocationTypeRepository;
