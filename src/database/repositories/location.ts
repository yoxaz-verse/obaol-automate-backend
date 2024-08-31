import { Request } from "express";
import { LocationModel } from "../models/location";
import {
  ILocation,
  ICreateLocation,
  IUpdateLocation,
} from "../../interfaces/location";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationRepository {
  public async getLocations(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocation[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const locations = await LocationModel.find(query)
        .populate("locationType")
        .populate("locationManagers")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: locations as unknown as ILocation[], // Convert to 'unknown' first, then cast
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const location = await LocationModel.findById(id)
        .populate("locationType")
        .populate("locationManagers")
        .lean();
      if (!location) {
        throw new Error("Location not found");
      }
      return location as unknown as ILocation; // Convert to 'unknown' first, then cast
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(
    req: Request,
    locationData: ICreateLocation
  ): Promise<ILocation> {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-createLocation");
      throw error;
    }
  }

  public async updateLocation(
    req: Request,
    id: string,
    locationData: Partial<IUpdateLocation>
  ): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        id,
        locationData,
        {
          new: true,
        }
      )
        .populate("locationType")
        .populate("locationManagers");
      if (!updatedLocation) {
        throw new Error("Failed to update location");
      }
      return updatedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(id)
        .populate("locationType")
        .populate("locationManagers");
      if (!deletedLocation) {
        throw new Error("Failed to delete location");
      }
      return deletedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;
