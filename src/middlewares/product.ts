import { Request, Response, NextFunction } from "express";

class ProductMiddleware {
  public async createProduct(req: Request, res: Response, next: NextFunction) {
    const { name, description, subCategory } = req.body;
    if (!name || !description || !subCategory) {
      res.status(400).json({
        message:
          "Missing required fields: name, description, subCategory are required.",
      });
      return;
    }
    next();
  }

  public async updateProduct(req: Request, res: Response, next: NextFunction) {
    const { name, description, subCategory } = req.body;
    if (!name && !description && !subCategory) {
      res
        .status(400)
        .json({ message: "At least one field must be provided for update." });
      return;
    }
    next();
  }

  public async validateProductId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      res.status(400).json({ message: "Product ID is required." });
      return;
    }
    next();
  }
}

export default ProductMiddleware;
