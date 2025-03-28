import { Request, Response, NextFunction } from "express";

class VariantRateMiddleware {
  public async createVariantRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { rate, productVariant, associate } = req.body;
    if (rate === undefined || !productVariant || !associate) {
      res.status(400).json({
        message:
          "Missing required fields: rate, productVariant, and associate are required.",
      });
      return;
    }
    next();
  }

  public async updateVariantRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { rate, productVariant, associate, commission, selected, isLive } =
      req.body;
    if (
      !rate &&
      !productVariant &&
      !associate &&
      !selected &&
      !commission &&
      !(isLive == true || isLive == false)
    ) {
      res
        .status(400)
        .json({ message: "At least one field must be provided for update." });
      return;
    }
    next();
  }

  public async validateVariantRateId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      res.status(400).json({ message: "VariantRate ID is required." });
      return;
    }
    next();
  }
}

export default VariantRateMiddleware;
