import { Request, Response, NextFunction } from "express";

class AssociateCompanyMiddleware {
  public createAssociateCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, email, phone, state, district, city } = req.body;
    if (!name || !email || !phone || !state || !district || !city) {
      res.status(400).json({
        message:
          "All fields (name, email, phone, state , district, city ) must be provided.",
      });
      return;
    }
    next();
  }

  public updateAssociateCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, email, phone, state, district, city } = req.body;
    if (!name && !email && !phone && !district && !city) {
      res
        .status(400)
        .json({ message: "At least one field must be provided for updates." });
      return;
    }
    next();
  }

  public validateAssociateCompanyId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.params.id) {
      res.status(400).json({ message: "Associate Company ID is required." });
      return;
    }
    next();
  }
}

export default AssociateCompanyMiddleware;
