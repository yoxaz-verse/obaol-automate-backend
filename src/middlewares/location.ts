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
}

export default LocationMiddleware;
