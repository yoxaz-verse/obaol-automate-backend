import { Request, Response, NextFunction } from "express";

class QuantityUnitMiddleware {
  public async createQuantityUnit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // const { name, description, subCategory } = req.body;
    // if (!name || !description || !subCategory) {
    //   res.status(400).json({
    //     message:
    //       "Missing required fields: name, description, subCategory are required.",
    //   });
    //   return;
    // }
    next();
  }

  public async updateQuantityUnit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // const { name, description, subCategory } = req.body;
    // if (!name && !description && !subCategory) {
    //   res
    //     .status(400)
    //     .json({ message: "At least one field must be provided for update." });
    //   return;
    // }
    next();
  }

  public async validateQuantityUnitId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // if (!req.params.id) {
    //   res.status(400).json({ message: "QuantityUnit ID is required." });
    //   return;
    // }
    next();
  }
}

export default QuantityUnitMiddleware;
