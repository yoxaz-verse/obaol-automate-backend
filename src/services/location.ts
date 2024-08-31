import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

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
      res.sendArrayFormatted(locations, "Locations retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationService-getLocations");
      res.sendError(error, "Locations retrieval failed");
    }
  }

  public async getLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await this.locationRepository.getLocationById(req, id);
      res.sendFormatted(location, "Location retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationService-getLocation");
      res.sendError(error, "Location retrieval failed");
    }
  }

  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body;
      const newLocation = await this.locationRepository.createLocation(req, locationData);
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationService-createLocation");
      res.sendError(error, "Location creation failed");
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
      res.sendFormatted(updatedLocation, "Location updated successfully");
    } catch (error) {
      await logError(error, req, "LocationService-updateLocation");
      res.sendError(error, "Location update failed");
    }
  }

  public async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocation = await this.locationRepository.deleteLocation(req, id);
      res.sendFormatted(deletedLocation, "Location deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError(error, "Location deletion failed");
    }
  }
}

export default LocationService;
