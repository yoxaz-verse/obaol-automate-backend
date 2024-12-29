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
        // locationData.locationManager = selectedKeys;
        locationData.locationManagers = selectedKeys.reduce(
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

  bulkCreateLocations = async (req: Request, res: Response) => {
    try {
      const locations = req.body;

      if (!Array.isArray(locations) || locations.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty request body." });
      }

      const errorMessages: string[] = [];

      // Step 1: Fetch LocationType IDs
      const locationTypes = await LocationTypeModel.find({
        name: { $in: locations.map((loc) => loc.locationType) },
      });
      const locationTypeMap = new Map(
        locationTypes.map((type) => [type.name, type._id])
      );

      // Step 2: Process each location and parse locationManagers
      const formattedLocations = await Promise.all(
        locations.map(async (loc) => {
          // Parse and validate locationType
          const locationTypeId = locationTypeMap.get(loc.locationType);
          if (!locationTypeId) {
            errorMessages.push(
              `Location type "${loc.locationType}" not found for location "${loc.name}".`
            );
            return null;
          }

          // Parse locationManager
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
            errorMessages.push(
              `Invalid locationManager format for location "${loc.name}".`
            );
            return null;
          }

          // Fetch or Create LocationManagers
          const managerIds = await Promise.all(
            parsedManagers.map(async ({ name, code }: any) => {
              let manager = await LocationManagerModel.findOne({ name });
              if (!manager) {
                manager = await LocationManagerModel.create({ name });
              }
              return { manager: manager._id, code };
            })
          );

          // Format location for saving
          return {
            ...loc,
            locationType: locationTypeId,
            locationManagers: managerIds,
          };
        })
      );

      // Step 3: Filter out null locations
      const validLocations = formattedLocations.filter(Boolean);

      // Generate custom IDs for valid locations
      const validLocationsWithCustomIds = await Promise.all(
        validLocations.map(async (location) => {
          if (location.customId)
            return {
              ...location,
            };
          const customId = await generateCustomId(location.province);
          return {
            ...location,
            customId,
          };
        })
      );

      // Step 4: Save to database
      const createdLocations = await LocationModel.insertMany(
        validLocationsWithCustomIds
      );

      return res.status(201).json({
        message: "Locations created successfully",
        data: createdLocations,
        errors: errorMessages,
      });
    } catch (error) {
      console.error("Error in bulkCreateLocations:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }

    // Utility to generate custom ID
  };
}

// Define generateCustomId outside the bulkCreateLocations function
const generateCustomId = async (province: string): Promise<string> => {
  try {
    const provinceKey = province.toUpperCase();
    const counter = await LocationCounterModel.findOneAndUpdate(
      { provinceKey },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true }
    );

    if (!counter) {
      throw new Error(`Failed to update counter for province: ${provinceKey}`);
    }

    const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0");
    return `MG-${provinceKey}-${sequenceNumber}`;
  } catch (error) {
    console.error("Error generating customId:", error);
    throw error;
  }
};

export default LocationService;
