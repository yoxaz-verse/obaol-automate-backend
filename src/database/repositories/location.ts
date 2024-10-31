import { Request } from "express";
import { LocationModel } from "../models/location";
import {
  ICreateLocation,
  ILocationPopulated,
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
    data: ILocationPopulated[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const locationsDoc = await LocationModel.find(query)
        .populate("owner", "name email") // Adjust fields as needed
        .populate("locationType", "name") // Adjust fields as needed
        .populate("locationManagers", "code name") // Adjust fields as needed
        .populate("image") // Populate image field
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const locations = locationsDoc.map(
        (doc) => doc.toObject() as ILocationPopulated
      );

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: locations,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(
    req: Request,
    id: string
  ): Promise<ILocationPopulated> {
    try {
      const locationDoc = await LocationModel.findById(id)
        .populate("owner", "name email") // Adjust fields as needed
        .populate("locationType", "name") // Adjust fields as needed
        .populate("locationManagers", "code name") // Adjust fields as needed
        .populate("image"); // Populate image field

      if (!locationDoc) {
        throw new Error("Location not found");
      }

      return locationDoc.toObject() as ILocationPopulated;
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(
    req: Request,
    locationData: ICreateLocation
  ): Promise<ILocationPopulated> {
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
  ): Promise<ILocationPopulated> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        id,
        locationData,
        { new: true }
      )
        .populate("owner", "name email") // Adjust fields as needed
        .populate("locationType", "name") // Adjust fields as needed
        .populate("locationManagers", "code name") // Adjust fields as needed
        .populate("image"); // Populate image field
      if (!updatedLocation) {
        throw new Error("Failed to update Location");
      }
      return updatedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(
    req: Request,
    id: string
  ): Promise<ILocationPopulated> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(id)
        .populate("owner", "name email") // Adjust fields as needed
        .populate("locationType", "name") // Adjust fields as needed
        .populate("locationManagers", "code name") // Adjust fields as needed
        .populate("image"); // Populate image field
      if (!deletedLocation) {
        throw new Error("Failed to delete Location");
      }
      return deletedLocation.toObject();
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;
