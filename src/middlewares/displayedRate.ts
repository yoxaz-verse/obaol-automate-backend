import { Request, Response, NextFunction } from "express";

class DisplayedRateMiddleware {
  public async createDisplayedRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { commission, selected, variantRate, associate } = req.body;
    if ((commission === undefined && selected) || !variantRate || !associate) {
      res.status(400).json({
        message:
          "Missing required fields: rate, variantRate, and associate are required.",
      });
      return;
    }
    next();
  }

  public async updateDisplayedRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { commission, variantRate, associate } = req.body;
    if (!commission && !variantRate && !associate) {
      res
        .status(400)
        .json({ message: "At least one field must be provided for update." });
      return;
    }
    next();
  }

  public async validateDisplayedRateId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      res.status(400).json({ message: "DisplayedRate ID is required." });
      return;
    }
    next();
  }
}

export default DisplayedRateMiddleware;
