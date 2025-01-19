import { LocationManagerModel } from "../database/models/locationManager";
import { LocationTypeModel } from "../database/models/locationType";
import { Request, Response, NextFunction } from "express";

class LocationMiddleware {
  public async validateCreate(req: Request, res: Response, next: NextFunction) {
    const { name, address, city } = req.body;
    if (!name) {
      return res
        .status(400)
        .send("Missing required fields for creating a location");
    }
    next();
  }

  public async validateUpdate(req: Request, res: Response, next: NextFunction) {
    // const { fileId, fileURL } = req.body;
    // if (fileId && !fileURL) {
    //   return res
    //     .status(400)
    //     .send(
    //       "fileURL is required if fileId is provided for updating a location"
    //     );
    // }
    next();
  }

  validateBulkCreateLocations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const locations = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid or empty locations array" });
    }

    const invalidRows: any[] = [];

    for (const [index, location] of locations.entries()) {
      const errors: string[] = [];

      // Check for required fields and add error messages if missing or invalid
      if (!location.name) errors.push("Location name is missing.");
      if (!location.locationType) errors.push("Location type is missing.");
      if (!location.locationManager)
        errors.push("Location manager is missing.");
      if (!location.province) errors.push("Province is missing.");
      if (!location.nation) errors.push("Nation is missing.");
      if (!location.address) errors.push("Address is missing.");

      // Validate coordinates
      if (location.latitude && isNaN(parseFloat(location.latitude)))
        errors.push("Invalid latitude.");
      if (location.longitude && isNaN(parseFloat(location.longitude)))
        errors.push("Invalid longitude.");

      // Validate locationType reference
      const locationType = await LocationTypeModel.findOne({
        name: location.locationType,
      });
      if (!locationType)
        errors.push(`Invalid location type: ${location.locationType}`);

      // Validate locationManager reference
      const locationManager = await LocationManagerModel.findOne({
        name: location.locationManager,
      });
      if (!locationManager)
        errors.push(`Invalid location manager: ${location.locationManager}`);

      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, issues: errors });
      }
    }

    // If there are invalid rows, return an error response
    if (invalidRows.length > 0) {
      return res.status(400).json({
        message: "Bulk validation failed. Invalid rows found.",
        invalidRows, // Send details about the rows that have errors
      });
    }

    next(); // Proceed to the next middleware if no validation errors
  };
}

export default LocationMiddleware;
