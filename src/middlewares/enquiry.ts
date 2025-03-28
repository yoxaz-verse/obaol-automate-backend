import { Request, Response, NextFunction } from "express";

class EnquiryMiddleware {
  public async createEnquiry(req: Request, res: Response, next: NextFunction) {
    const { phoneNumber, name, variantRate, productVariant, productAssociate } =
      req.body;

    if (
      !phoneNumber ||
      !name ||
      !variantRate ||
      !productVariant ||
      !productAssociate
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: phoneNumber, name, variantRate, productVariant, productAssociate",
      });
    }
    next();
  }

  public async updateEnquiry(req: Request, res: Response, next: NextFunction) {
    // All fields optional, but let's require at least one field
    const { phoneNumber, name, variantRate, productVariant, productAssociate } =
      req.body;

    if (
      phoneNumber === undefined &&
      name === undefined &&
      variantRate === undefined &&
      productVariant === undefined &&
      productAssociate === undefined
    ) {
      return res
        .status(400)
        .json({ message: "At least one field must be provided for update." });
    }
    next();
  }

  public async validateEnquiryId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      return res.status(400).json({ message: "Enquiry ID is required." });
    }
    // If you want to check for valid ObjectId, do so here
    next();
  }
}

export default EnquiryMiddleware;
