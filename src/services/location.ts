import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import {
  LocationCounterModel,
  LocationModel,
} from "../database/models/location";
import { LocationManagerModel } from "../database/models/locationManager";
import { LocationTypeModel } from "../database/models/locationType";

class LocationService {
  private locationRepository: LocationRepository;

  constructor() {
    this.locationRepository = new LocationRepository();
  }

  // Helper function to check for duplicate locationManager name-code pairs
  private async checkDuplicateManagerPairs(locationManagers: any[]) {
    const duplicatePairs = [];

    for (const manager of locationManagers) {
      const existingLocation = await LocationModel.findOne({
        "locationManagers.manager": manager.manager,
        "locationManagers.code": manager.code,
      });

      if (existingLocation) {
        duplicatePairs.push(manager);
      }
    }

    return duplicatePairs;
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

        // Transform locationManager data into the required schema format
        locationData.locationManagers = selectedKeys.map((key: string) => ({
          manager: key,
          code: customValues[key],
        }));

        // Check for duplicate name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          locationData.locationManagers
        );

        if (duplicatePairs.length > 0) {
          return res.status(400).json({
            message: "Duplicate locationManager name-code pairs detected.",
            duplicates: duplicatePairs,
          });
        }

        // Remove unnecessary fields from the payload
        delete locationData.locationManager;
      }

      // Save location to the database
      const newLocation = await this.locationRepository.createLocation(
        req,
        locationData
      );

      // Return success response
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      // Log and handle error
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
        locationData.locationManagers = selectedKeys.map((key: string) => ({
          manager: key,
          code: customValues[key],
        }));

        // Check for duplicate name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          locationData.locationManagers
        );

        if (duplicatePairs.length > 0) {
          return res.status(400).json({
            message: "Duplicate locationManager name-code pairs detected.",
            duplicates: duplicatePairs,
          });
        }
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

      // Ensure the request body is an array and not empty
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({
          message: "Invalid or empty request body.",
        });
      }

      const errorMessages: string[] = [];
      const validLocations: any[] = [];

      // Step 1: Fetch LocationType IDs (handling errors if not found)
      const locationTypes = await LocationTypeModel.find({
        name: { $in: locations.map((loc) => loc.locationType) },
      });
      const locationTypeMap = new Map(
        locationTypes.map((type) => [type.name, type._id])
      );

      if (locationTypes.length !== locations.length) {
        errorMessages.push(
          "Some location types were not found in the database."
        );
      }

      // Step 2: Process each location and validate the data
      for (const loc of locations) {
        const locationErrors: string[] = [];
        const managerErrors: string[] = [];

        const locationTypeId = locationTypeMap.get(loc.locationType);

        // Validate LocationType
        if (!locationTypeId) {
          locationErrors.push(
            `Location type "${loc.locationType}" not found for location "${loc.name}".`
          );
        }

        // Parse and validate locationManager (assuming a specific format for manager data)
        let parsedManagers = [];
        try {
          const managerString = loc.locationManager.trim().slice(1, -1); // Remove square brackets
          const managerPairs = managerString.split("},").map((pair: any) => {
            const cleanedPair = pair.replace(/[{}]/g, "").trim(); // Remove curly braces
            const [key, value] = cleanedPair
              .split(":")
              .map((s: any) => s.trim());
            return { name: key, code: value };
          });

          parsedManagers = managerPairs.filter(
            (manager: any) => manager.name && manager.code
          );
        } catch (error) {
          managerErrors.push(
            `Invalid locationManager format for location "${loc.name}".`
          );
        }

        // Step 3: Check for duplicate locationManager name-code pairs
        const duplicatePairs = await this.checkDuplicateManagerPairs(
          parsedManagers
        );
        if (duplicatePairs.length > 0) {
          managerErrors.push(
            `Duplicate locationManager name-code pairs detected for location "${loc.name}".`
          );
        }

        if (locationErrors.length > 0 || managerErrors.length > 0) {
          errorMessages.push(...locationErrors, ...managerErrors);
          continue; // Skip the current location if it has errors
        }

        // Fetch or create LocationManagers
        const managerIds = await Promise.all(
          parsedManagers.map(async ({ name, code }: any) => {
            let manager = await LocationManagerModel.findOne({ name });
            if (!manager) {
              try {
                manager = await LocationManagerModel.create({ name });
              } catch (error) {
                errorMessages.push(
                  `Error creating manager "${name}" for location "${loc.name}".`
                );
                return null; // Skip this location manager creation
              }
            }
            return { manager: manager._id, code };
          })
        );

        // Step 4: Format valid location data
        validLocations.push({
          ...loc,
          locationType: locationTypeId,
          locationManagers: managerIds.filter(Boolean), // Remove any null values
        });
      }

      // Step 5: Check if there are any locations without errors
      if (validLocations.length === 0) {
        return res.status(400).json({
          message: "No valid locations to create.",
          errors: errorMessages,
        });
      }

      // Step 6: Generate custom IDs for valid locations
      const validLocationsWithCustomIds = await Promise.all(
        validLocations.map(async (location) => {
          if (location.customId) {
            return location;
          }

          const customId = await this.generateCustomId(location.province);
          return {
            ...location,
            customId,
          };
        })
      );

      // Step 7: Save valid locations to database (insertMany handles bulk insert)
      try {
        const createdLocations = await LocationModel.insertMany(
          validLocationsWithCustomIds
        );
        return res.status(201).json({
          message: "Locations created successfully.",
          data: createdLocations,
          errors: errorMessages.length > 0 ? errorMessages : null,
        });
      } catch (error: unknown) {
        console.error("Error saving locations:", error);
        return res.status(500).json({
          message: "Error saving locations to the database.",
          error:
            error instanceof Error ? error.message : "Error saving locations",
        });
      }
    } catch (error: unknown) {
      // Type guard to check if the error is an instance of Error
      if (error instanceof Error) {
        console.error("Unexpected error in bulkCreateLocations:", error);
        return res.status(500).json({
          message: "An unexpected error occurred.",
          error: error.message, // Safely access error.message
        });
      } else {
        // Handle cases where the error is not an instance of Error (if necessary)
        console.error("Unexpected non-error object:", error);
        return res.status(500).json({
          message: "An unexpected error occurred.",
          error: "An unknown error occurred.", // Fallback message
        });
      }
    }
  }

  // Utility to check for duplicate locationManager name-code pairs
  // Utility to generate custom ID
  private async generateCustomId(province: string): Promise<string> {
    try {
      const provinceKey = province.toUpperCase();
      const counter = await LocationCounterModel.findOneAndUpdate(
        { provinceKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true }
      );

      if (!counter) {
        throw new Error(
          `Failed to update counter for province: ${provinceKey}`
        );
      }

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0");
      return `MG-${provinceKey}-${sequenceNumber}`;
    } catch (error) {
      console.error("Error generating customId:", error);
      throw error;
    }
  }
}

export default LocationService;
