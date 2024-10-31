// src/services/location.ts
import { Request, Response } from "express";
import LocationRepository from "../database/repositories/location";
import FileRepository from "../database/repositories/file";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { ICreateLocation, ILocationPopulated } from "../interfaces/location";
import path from "path";
import { IFile } from "../interfaces/file";

class LocationService {
  private locationRepository: LocationRepository;
  private fileRepository: FileRepository;

  constructor() {
    this.locationRepository = new LocationRepository();
    this.fileRepository = new FileRepository();
  }

  // Type guard to check if an object is of type IFile
  private isIFile(obj: any): obj is IFile {
    return obj && typeof obj === "object" && "_id" in obj;
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

  // src/services/location.ts
  public async createLocation(req: Request, res: Response) {
    try {
      const locationData = req.body as ICreateLocation;
      const file = req.file;
      if (!file) {
        res.sendError(
          "ValidationError: Image file is required",
          "Image file is required",
          400
        );
        return;
      }

      // Save the image file using FileRepository
      const fileData = {
        imageName: file.originalname,
        mimeType: file.mimetype,
        size: file.size.toString(),
        path: path.join("uploads", file.filename),
      };

      // const [newFile] = await this.fileRepository.createFiles([fileData]);

      // Convert ObjectId to string before assignment
      locationData.image = newFile._id.toString();

      const newLocation = await this.locationRepository.createLocation(
        req,
        locationData
      );
      res.sendFormatted(newLocation, "Location created successfully", 201);
    } catch (error) {
      await logError(error, req, "LocationService-createLocation");
      res.sendError(error, "Location creation failed");
    }
  }

  // src/services/location.ts
  public async updateLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const locationData = req.body as Partial<ICreateLocation>;

      if (req.file) {
        // If a new image file is uploaded, save it and update the image field
        const file = req.file;

        // Save the new image file using FileRepository
        const fileData = {
          imageName: file.originalname,
          mimeType: file.mimetype,
          size: file.size.toString(),
          path: path.join("uploads", file.filename),
        };

        // const [newFile] = await this.fileRepository.createFiles([fileData]);

        // Convert ObjectId to string before assignment
        locationData.image = newFile._id.toString();
      }

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
      const deletedLocation = (await this.locationRepository.deleteLocation(
        req,
        id
      )) as ILocationPopulated;

      // Optionally, delete the associated image file
      if (deletedLocation.image && this.isIFile(deletedLocation.image)) {
        const fileId = deletedLocation.image._id.toString(); // Convert ObjectId to string
        await this.fileRepository.deleteFileById(fileId);
      }

      res.sendFormatted(deletedLocation, "Location deleted successfully");
    } catch (error) {
      await logError(error, req, "LocationService-deleteLocation");
      res.sendError(error, "Location deletion failed");
    }
  }
}

export default LocationService;
