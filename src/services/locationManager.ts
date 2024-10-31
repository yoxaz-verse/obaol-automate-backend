import { Request, Response } from "express";
import LocationManagerRepository from "../database/repositories/locationManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationManagerService {
  private locationManagerRepository: LocationManagerRepository;

  constructor() {
    this.locationManagerRepository = new LocationManagerRepository();
  }

  public async getLocationManagers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationManagers = await this.locationManagerRepository.getLocationManagers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locationManagers, "LocationManagers retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManagers");
      res.sendError(error, "LocationManagers retrieval failed");
    }
  }

  public async getLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManager = await this.locationManagerRepository.getLocationManagerById(req, id);
      res.sendFormatted(locationManager, "LocationManager retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-getLocationManager");
      res.sendError(error, "LocationManager retrieval failed");
    }
  }

  public async createLocationManager(req: Request, res: Response) {
    try {
      const locationManagerData = req.body;
      const newLocationManager = await this.locationManagerRepository.createLocationManager(req, locationManagerData);
      res.sendFormatted(newLocationManager, "LocationManager created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationManagerService-createLocationManager");
      res.sendError(error, "LocationManager creation failed");
    }
  }

  public async updateLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationManagerData = req.body;
      const updatedLocationManager = await this.locationManagerRepository.updateLocationManager(
        req,
        id,
        locationManagerData
      );
      res.sendFormatted(updatedLocationManager, "LocationManager updated successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-updateLocationManager");
      res.sendError(error, "LocationManager update failed");
    }
  }

  public async deleteLocationManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationManager = await this.locationManagerRepository.deleteLocationManager(req, id);
      res.sendFormatted(deletedLocationManager, "LocationManager deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationManagerService-deleteLocationManager");
      res.sendError(error, "LocationManager deletion failed");
    }
  }
}

export default LocationManagerService;

