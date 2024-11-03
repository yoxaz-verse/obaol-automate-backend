import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { ILocation } from "../../interfaces/location";
import { LocationModel } from "../../database/models/location";

class LocationRepository {
  public async getLocations(
    req: Request,
    pagination: { page: number; limit: number },
    search: string
  ): Promise<{
    data: ILocation[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      const locations = await LocationModel.find(query)
        .populate("locationType", "name")
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .exec();

      return { data: locations, totalCount, currentPage, totalPages };
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocations");
      throw error;
    }
  }

  public async getLocationById(req: Request, id: string): Promise<ILocation> {
    try {
      const location = await LocationModel.findById(id).populate(
        "locationType",
        "name"
      );
      if (!location) {
        throw new Error("Location not found");
      }
      return location;
    } catch (error) {
      await logError(error, req, "LocationRepository-getLocationById");
      throw error;
    }
  }

  public async createLocation(
    req: Request,
    locationData: Partial<ILocation>
  ): Promise<ILocation> {
    try {
      const newLocation = await LocationModel.create(locationData);
      return newLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-createLocation");
      throw error;
    }
  }

  public async updateLocation(
    req: Request,
    id: string,
    locationData: Partial<ILocation>
  ): Promise<ILocation> {
    try {
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        id,
        locationData,
        { new: true }
      ).populate("locationType", "name");
      if (!updatedLocation) {
        throw new Error("Failed to update location");
      }
      return updatedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-updateLocation");
      throw error;
    }
  }

  public async deleteLocation(req: Request, id: string): Promise<ILocation> {
    try {
      const deletedLocation = await LocationModel.findByIdAndDelete(
        id
      ).populate("locationType", "name");
      if (!deletedLocation) {
        throw new Error("Failed to delete location");
      }
      return deletedLocation;
    } catch (error) {
      await logError(error, req, "LocationRepository-deleteLocation");
      throw error;
    }
  }
}

export default LocationRepository;
