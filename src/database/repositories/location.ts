import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { ILocation } from "../../interfaces/location";
import { LocationModel } from "../models/location";
import mongoose from "mongoose";

class LocationRepository {
  public async getLocations(
    req: Request,
    pagination: { page: number; limit: number },
    filters: any
  ) {
    try {
      console.log(
        "✅ Incoming Query Filters:",
        JSON.stringify(filters, null, 2)
      );

      const query: any = {};

      // ✅ Fix: Properly handle `locationManager` filter
      // ✅ Fix: Handle `locationManager` filter properly
      if (filters.locationManager) {
        let managerIds: mongoose.Types.ObjectId[] = [];

        // ✅ Extract `$in` array if present
        let locationManagerArray: string[] = [];

        if (
          typeof filters.locationManager === "object" &&
          filters.locationManager.$in
        ) {
          locationManagerArray = filters.locationManager.$in;
        } else if (Array.isArray(filters.locationManager)) {
          locationManagerArray = filters.locationManager;
        } else {
          locationManagerArray = [filters.locationManager];
        }

        // ✅ Convert valid strings to `ObjectId`
        managerIds = locationManagerArray
          .filter((id: string) => mongoose.Types.ObjectId.isValid(id)) // Validate IDs
          .map((id: string) => new mongoose.Types.ObjectId(id)); // Convert to ObjectId

        // ✅ Apply filter only if valid ObjectIds exist
        if (managerIds.length > 0) {
          query["locationManagers.manager"] = { $in: managerIds }; // 🔥 FIXED: Correctly referencing `manager`
        }
      }

      // ✅ Include other filters dynamically (excluding `locationManager` since it's already handled)
      Object.keys(filters).forEach((key) => {
        if (key !== "locationManager") {
          query[key] = filters[key];
        }
      });

      console.log("🔍 Final Location Query:", JSON.stringify(query, null, 2));

      // Count documents before fetching
      const totalCount = await LocationModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      const currentPage = pagination.page;

      // Fetch locations
      const locations = await LocationModel.find(query)
        .populate({
          path: "locationManagers.manager",
          select: "name",
        })
        .populate("locationType")
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
      const location = await LocationModel.findById(id)
        .populate({
          path: "locationManagers.manager",
          select: "name", // Only include manager's name
        })
        .populate("locationType", "name");
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
      )
        .populate({
          path: "locationManagers.manager",
          select: "name",
        })
        .populate("locationType", "name");
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
