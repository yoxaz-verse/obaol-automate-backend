import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class ProductVariantMiddleware {
  public async createProductVariant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, description, isAvailable, isLive, product } = req.body;
    if (!name || !description || product === undefined) {
      res
        .status(400)
        .json({
          message:
            "Missing required fields: name, description, and product are required.",
        });
      return;
    }
    next();
  }

  public async updateProductVariant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, description, isAvailable, isLive, product } = req.body;
    if (!name && !description && product === undefined) {
      res
        .status(400)
        .json({ message: "At least one field must be provided for update." });
      return;
    }
    next();
  }

  public async validateVariantId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      res.status(400).json({ message: "Product Variant ID is required." });
      return;
    }
    next();
  }
}

export default ProductVariantMiddleware;
