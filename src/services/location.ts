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

  bulkCreateLocations = async (req: Request, res: Response) => {
    try {
      const locations = req.body;

      if (!Array.isArray(locations) || locations.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or empty request body." });
      }

      const errorMessages: string[] = [];
      const allManagers: any[] = locations.flatMap((loc) => {
        let managers = loc.locationManager;

        // Parse locationManager if it's a string
        if (
          typeof managers === "string" &&
          managers.startsWith("[") &&
          managers.endsWith("]")
        ) {
          try {
            // Remove brackets and split into individual manager objects
            const cleanedString = managers.trim().slice(1, -1); // Remove brackets
            console.log("cleanedString:", cleanedString);

            // Use regex to parse key-value pairs
            const managerObjects = cleanedString
              .split("},")
              .map((managerPair) => {
                const trimmedPair = managerPair.replace(/[{}]/g, "").trim(); // Remove braces
                const [key, value] = trimmedPair
                  .split(":")
                  .map((str) => str.trim());
                console.log("cleanedStrin", cleanedString);

                if (key && value) {
                  return { name: key, code: value }; // Correctly parse name and code
                } else {
                  errorMessages.push(
                    `Invalid manager format in location "${loc.name}": ${managerPair}`
                  );
                  return null;
                }
              })
              .filter(Boolean); // Filter out null values

            return managerObjects;
          } catch (error) {
            console.error("Error parsing locationManager:", error);
            errorMessages.push(
              `Failed to parse locationManager for location "${loc.name}"`
            );
            return [];
          }
        }

        return [];
      });
      console.log("allManagers", allManagers);

      // Deduplicate manager entries by `name` or `code`
      const uniqueManagers = Array.from(
        new Map(allManagers.map((manager) => [manager.code, manager])).values()
      );
      console.log("uniqueManagers", uniqueManagers);

      // Fetch existing managers by name
      const existingManagers = await LocationManagerModel.find({
        name: { $in: uniqueManagers.map((manager) => manager.name) },
      });
      console.log("existingManagers", existingManagers);

      // Create new managers for those not found
      const existingManagerMap = new Map(
        existingManagers.map((manager) => [manager.name, manager._id])
      );
      const newManagers = uniqueManagers.filter(
        (manager) => !existingManagerMap.has(manager.name)
      );
      console.log("newManagers", newManagers);

      let createdManagers = [] as any;
      if (newManagers.length > 0) {
        createdManagers = await LocationManagerModel.insertMany(
          newManagers.map(({ name }) => ({ name }))
        );
      }
      console.log("createdManagers", createdManagers);

      // Combine all manager references
      const allValidManagers = [...existingManagers, ...createdManagers];
      const managerMap = new Map(
        allValidManagers.map((manager) => [manager.name, manager._id])
      );

      // Validate and map managers for each location
      const formattedLocations = locations.map((loc) => {
        const managerIds = (
          typeof loc.locationManager === "string" &&
          JSON.parse(loc.locationManager)
        )
          .map((manager: Record<string, string>) => {
            console.log(manager);

            const [name] = Object.entries(manager)[0] || [];
            return managerMap.get(name) || null;
          })
          .filter(Boolean);
        console.log("formattedLocations", formattedLocations);

        return {
          ...loc,
          locationManager: managerIds,
        };
      });
      console.log("formattedLocations:", formattedLocations);

      // Save locations to the database
      const createdLocations = await LocationModel.insertMany(
        formattedLocations
      );
      console.log("createdLocations:", createdLocations);

      return res.status(201).json({
        message: "Locations created successfully",
        data: createdLocations,
        errors: errorMessages,
      });
    } catch (error) {
      console.error("Error in bulkCreateLocations:", error);
      return res.status(500).json({ message: "Internal server error", error });
    }
  };
}

export default LocationService;
