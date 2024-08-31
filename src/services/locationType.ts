import { Request, Response } from "express";
import LocationTypeRepository from "../database/repositories/locationType";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class LocationTypeService {
  private locationTypeRepository: LocationTypeRepository;

  constructor() {
    this.locationTypeRepository = new LocationTypeRepository();
  }

  public async getLocationTypes(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const locationTypes = await this.locationTypeRepository.getLocationTypes(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(locationTypes, "Location Types retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationTypes");
      res.sendError(error, "Location Types retrieval failed");
    }
  }

  public async getLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationType = await this.locationTypeRepository.getLocationTypeById(req, id);
      res.sendFormatted(locationType, "Location Type retrieved successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationType");
      res.sendError(error, "Location Type retrieval failed");
    }
  }

  public async createLocationType(req: Request, res: Response) {
    try {
      const locationTypeData = req.body;
      const newLocationType = await this.locationTypeRepository.createLocationType(req, locationTypeData);
      res.sendFormatted(newLocationType, "Location Type created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationTypeService-createLocationType");
      res.sendError(error, "Location Type creation failed");
    }
  }

  public async updateLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationTypeData = req.body;
      const updatedLocationType = await this.locationTypeRepository.updateLocationType(
        req,
        id,
        locationTypeData
      );
      res.sendFormatted(updatedLocationType, "Location Type updated successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-updateLocationType");
      res.sendError(error, "Location Type update failed");
    }
  }

  public async deleteLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationType = await this.locationTypeRepository.deleteLocationType(req, id);
      res.sendFormatted(deletedLocationType, "Location Type deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationTypeService-deleteLocationType");
      res.sendError(error, "Location Type deletion failed");
    }
  }
}

export default LocationTypeService;
