// src/services/locationType.ts

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

      res.sendArrayFormatted(
        locationTypes,
        "Location types retrieved successfully"
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationTypes");
      res.sendError(error, "Location types retrieval failed", 500);
    }
  }

  public async getLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationType =
        await this.locationTypeRepository.getLocationTypeById(req, id);

      if (!locationType) {
        res.sendError(
          "Location type not found",
          "Location type retrieval failed",
          404
        );
        return;
      }

      res.sendFormatted(
        locationType,
        "Location type retrieved successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-getLocationType");
      res.sendError(error, "Location type retrieval failed", 500);
    }
  }

  public async createLocationType(req: Request, res: Response) {
    try {
      const locationTypeData = req.body;

      const newLocationType =
        await this.locationTypeRepository.createLocationType(
          req,
          locationTypeData
        );

      res.sendFormatted(
        newLocationType,
        "Location type created successfully",
        201
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-createLocationType");
      res.sendError(error, "Location type creation failed", 500);
    }
  }

  public async updateLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationTypeData = req.body;

      const updatedLocationType =
        await this.locationTypeRepository.updateLocationType(
          req,
          id,
          locationTypeData
        );

      if (!updatedLocationType) {
        res.sendError(
          "Location type not found or no changes made",
          "Location type update failed",
          404
        );
        return;
      }

      res.sendFormatted(
        updatedLocationType,
        "Location type updated successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-updateLocationType");
      res.sendError(error, "Location type update failed", 500);
    }
  }

  public async deleteLocationType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedLocationType =
        await this.locationTypeRepository.deleteLocationType(req, id);

      if (!deletedLocationType) {
        res.sendError(
          "Location type not found or already deleted",
          "Location type deletion failed",
          404
        );
        return;
      }

      res.sendFormatted(
        deletedLocationType,
        "Location type deleted successfully",
        200
      );
    } catch (error) {
      await logError(error, req, "LocationTypeService-deleteLocationType");
      res.sendError(error, "Location type deletion failed", 500);
    }
  }
}

export default LocationTypeService;
