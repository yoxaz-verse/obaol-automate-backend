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
      const locations = req.body;

      // Validate input
      if (!Array.isArray(locations) || locations.length === 0) {
        res.sendError("", "Invalid or empty locations payload", 400);
        return;
      }

      // Extract all locationManager objects from the payload
      const allManagers = locations.flatMap((loc) => loc.locationManager || []);

      // Deduplicate managers based on their `code`
      const uniqueManagerCodes = Array.from(
        new Set(allManagers.map((manager: any) => manager.code))
      );

      // Find existing managers in the database by their `code`
      const existingManagers = await LocationManagerModel.find({
        code: { $in: uniqueManagerCodes },
      });

      const existingManagerCodes = new Set(
        existingManagers.map((manager: any) => manager.code)
      );

      // Identify new managers (those not in the database)
      const newManagers = allManagers.filter(
        (manager: any) => !existingManagerCodes.has(manager.code)
      );

      // Insert new managers into the database
      let createdManagers: any = [];
      if (newManagers.length > 0) {
        createdManagers = await LocationManagerModel.insertMany(newManagers);
      }

      // Combine existing and newly created managers
      const allValidManagers = [...existingManagers, ...createdManagers];

      // Format locations
      const formattedLocations = locations.map((location) => {
        const locationManagerArray = Array.isArray(location.locationManager)
          ? location.locationManager
          : []; // Ensure locationManager is an array

        // Find corresponding manager IDs from valid managers
        const validManagersForLocation = locationManagerArray
          .map(
            (manager: any) =>
              allValidManagers.find(
                (validManager: any) => validManager.code === manager.code
              )?._id
          )
          .filter(Boolean); // Filter out any undefined values

        return {
          ...location,
          locationManager:
            validManagersForLocation.length > 0
              ? validManagersForLocation
              : null, // Set to null if no valid managers
        };
      });

      // Insert locations into the database
      const createdLocations = await LocationModel.insertMany(
        formattedLocations
      );

      res.sendFormatted(
        createdLocations,
        "Locations and managers created/linked successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "LocationService-bulkCreateLocations");
      res.sendError(error, "Bulk location creation failed", 500);
    }
  }
}

export default LocationService;
