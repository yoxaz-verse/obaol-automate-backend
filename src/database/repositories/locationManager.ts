import { Request } from "express";
import { LocationManagerModel } from "../models/locationManager";
import {
  ILocationManager,
  ICreateLocationManager,
  IUpdateLocationManager,
} from "../../interfaces/locationManager";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class LocationManagerRepository {
  public async getLocationManagers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ILocationManager[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const locationManagersDoc = await LocationManagerModel.find(query)
        .populate("location")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const locationManagers = locationManagersDoc.map(
        (doc) => doc.toObject() as any
      );

      const totalCount = await LocationManagerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: locationManagers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-getLocationManagers"
      );
      throw error;
    }
  }

  public async getLocationManagerById(
    req: Request,
    id: string
  ): Promise<ILocationManager> {
    try {
      const locationManagerDoc = await LocationManagerModel.findById(
        id
      ).populate("location");

      if (!locationManagerDoc) {
        throw new Error("LocationManager not found");
      }

      return locationManagerDoc.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-getLocationManagerById"
      );
      throw error;
    }
  }

  public async createLocationManager(
    req: Request,
    locationManagerData: ICreateLocationManager
  ): Promise<ILocationManager> {
    try {
      const newLocationManager = await LocationManagerModel.create(
        locationManagerData
      );
      return newLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-createLocationManager"
      );
      throw error;
    }
  }

  public async updateLocationManager(
    req: Request,
    id: string,
    locationManagerData: Partial<IUpdateLocationManager>
  ): Promise<ILocationManager> {
    try {
      const updatedLocationManager =
        await LocationManagerModel.findByIdAndUpdate(id, locationManagerData, {
          new: true,
        }).populate("location");
      if (!updatedLocationManager) {
        throw new Error("Failed to update LocationManager");
      }
      return updatedLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-updateLocationManager"
      );
      throw error;
    }
  }

  public async deleteLocationManager(
    req: Request,
    id: string
  ): Promise<ILocationManager> {
    try {
      const deletedLocationManager =
        await LocationManagerModel.findByIdAndDelete(id).populate("location");
      if (!deletedLocationManager) {
        throw new Error("Failed to delete LocationManager");
      }
      return deletedLocationManager.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "LocationManagerRepository-deleteLocationManager"
      );
      throw error;
    }
  }
}

export default LocationManagerRepository;
