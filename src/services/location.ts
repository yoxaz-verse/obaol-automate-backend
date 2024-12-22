import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { LocationModel } from "../database/models/location";
import { LocationManagerModel } from "../database/models/locationManager";

class LocationService {
  private locationRepository: LocationRepository;

  constructor() {
    this.locationRepository = new LocationRepository();
  }

  public async getLocations(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locations = await this.locationRepository.getLocations(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(
        locations,
        "Locations retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationService-getLocations");
      res.sendError("", "Locations retrieval failed", 500);
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, "Location retrieved successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-getLocation");
      res.sendError(error, "Location retrieval failed", 500);
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;

      // // Integrate fileId and fileURL received from another API
      // const { fileId, fileURL } = req.body;
      // if (fileId && fileURL) {
      //   locationData.fileId = fileId;
      //   locationData.fileURL = fileURL;
      // } else {
      //   res.sendError("", "fileId and fileURL must be provided", 400);
      //   return;
      // }

      const newLocation = await this.locationRepository.createLocation(
        req,
        locationData
      );
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationService-createLocation");
      res.sendError(error, "Location creation failed", 500);
    }
  }

  public async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationData = req.body;
      const updatedLocation = await this.locationRepository.updateLocation(
        req,
        id,
        locationData
      );
      res.sendFormatted(updatedLocation, "Location updated successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-updateLocation");
      res.sendError(error, "Location update failed", 500);
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(
        req,
        id
      );
      res.sendFormatted(deletedLocation, "Location deleted successfully", 200);
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError(error, "Location deletion failed", 500);
    }
  }
  public async bulkCreateLocations(req: Request, res: Response) {
    try {
      const { locations } = req.body;

      if (!Array.isArray(locations) || locations.length === 0) {
        res.sendError("", "Invalid or empty locations payload", 400);
        return;
      }

      // Validate and match locationManager IDs
      const managerIds = locations.map((loc) => loc.locationManager);
      const validManagers = await LocationManagerModel.find({
        _id: { $in: managerIds },
      }).select("_id");

      const validManagerIds = validManagers.map((manager: any) =>
        manager._id.toString()
      );

      // Process each location
      const formattedLocations = locations.map((location) => {
        // Replace invalid locationManager IDs with a default or exclude
        const validManager = location.locationManager.filter((id: any) =>
          validManagerIds.includes(id)
        );

        return {
          ...location,
          locationManager: validManager.length > 0 ? validManager : null, // Handle cases where no valid IDs exist
        };
      });

      // Insert into the database
      const createdLocations = await LocationModel.insertMany(
        formattedLocations
      );

      res.sendFormatted(
        createdLocations,
        "Locations created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "LocationService-bulkCreateLocations");
      res.sendError(error, "Bulk location creation failed", 500);
    }
  }
}

export default LocationService;
