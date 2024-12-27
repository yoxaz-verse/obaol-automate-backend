import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { LocationModel } from "../database/models/location";
import { LocationManagerModel } from "../database/models/locationManager";
import { LocationTypeModel } from "../database/models/locationType";

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

      // Extract and process locationManager data
      const { locationManager } = locationData;
      if (locationManager) {
        const { selectedKeys, customValues } = locationManager;

        // Map customValues to selectedKeys
        locationData.locationManager = selectedKeys;
        locationData.managerCodes = selectedKeys.reduce(
          (map: any, key: string) => {
            map[key] = customValues[key];
            return map;
          },
          {}
        );
      }

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

      // Extract and process locationManager data
      const { locationManager } = locationData;
      if (locationManager) {
        const { selectedKeys, customValues } = locationManager;

        // Map customValues to selectedKeys
        locationData.locationManager = selectedKeys;
        locationData.managerCodes = selectedKeys.reduce(
          (map: any, key: string) => {
            map[key] = customValues[key];
            return map;
          },
          {}
        );
      }

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

      // Initialize error tracking
      let errorMessages: string[] = [];

      // Extract unique locationType names from the payload
      const locationTypeNames = Array.from(
        new Set(locations.map((loc) => loc.locationType))
      );

      // Fetch locationType IDs from the database
      const locationTypes = await LocationTypeModel.find({
        name: { $in: locationTypeNames },
      });

      const locationTypeMap = new Map(
        locationTypes.map((type) => [type.name, type._id])
      );

      // Handle missing location types
      const missingLocationTypes = locationTypeNames.filter(
        (type) => !locationTypeMap.has(type)
      );
      if (missingLocationTypes.length > 0) {
        errorMessages.push(
          `Missing location types: ${missingLocationTypes.join(", ")}`
        );
      }

      // Extract and validate locationManager entries
      const allManagers = locations.flatMap((loc) => {
        const managers = loc.locationManager || [];
        return managers
          .map((manager: string) => {
            // Validate manager format: MANAGER_NAME:CUSTOM_CODE
            const managerParts = manager.split(":");
            if (managerParts.length !== 2) {
              errorMessages.push(
                `Invalid locationManager format for ${manager}`
              );
              return null; // Invalid manager, skip it
            }
            const [name, code] = managerParts;
            return { name, code };
          })
          .filter(Boolean); // Remove invalid managers
      });

      // If there are errors in locationManager format, stop further processing
      if (errorMessages.length > 0) {
        res.sendError(
          "",
          `Validation failed: ${errorMessages.join(", ")}`,
          400
        );
        return;
      }

      const uniqueManagerCodes = Array.from(
        new Set(allManagers.map((manager) => manager.code))
      );

      // Find existing managers in the database
      const existingManagers = await LocationManagerModel.find({
        code: { $in: uniqueManagerCodes },
      });

      const existingManagerMap = new Map(
        existingManagers.map((manager) => [manager.code, manager._id])
      );

      // Identify and insert new managers
      const newManagers = allManagers.filter(
        (manager) => !existingManagerMap.has(manager.code)
      );

      let createdManagers: any[] = [];
      if (newManagers.length > 0) {
        createdManagers = await LocationManagerModel.insertMany(newManagers);
      }

      // Combine all valid managers into a single map
      const allValidManagers = [...existingManagers, ...createdManagers];
      const managerMap = new Map(
        allValidManagers.map((manager) => [manager.code, manager._id])
      );

      // Validate and format locations
      const formattedLocations = locations
        .map((location) => {
          // Validate locationManager format
          const managerIds = (location.locationManager || [])
            .map((manager: string) => {
              const [, code] = manager.split(":");
              if (!managerMap.has(code)) {
                errorMessages.push(`Manager with code ${code} not found`);
                return null; // Invalid code, skip
              }
              return managerMap.get(code);
            })
            .filter(Boolean); // Remove invalid managers

          // Validate locationType
          const locationTypeId = locationTypeMap.get(location.locationType);
          if (!locationTypeId) {
            errorMessages.push(
              `Invalid locationType: ${location.locationType}`
            );
          }

          // If there are errors in locationType or locationManager, stop further processing
          if (errorMessages.length > 0) {
            return null; // Skip this location if it has errors
          }

          return {
            ...location,
            locationType: locationTypeId,
            locationManager: managerIds,
          };
        })
        .filter(Boolean); // Remove locations with errors

      // If no valid locations after filtering, return errors
      if (formattedLocations.length === 0 || errorMessages.length > 0) {
        res.sendError(
          "",
          `Validation failed: ${errorMessages.join(", ")}`,
          400
        );
        return;
      }

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
