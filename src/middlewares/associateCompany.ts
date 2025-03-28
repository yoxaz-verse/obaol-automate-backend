import { Request, Response, NextFunction } from "express";

class AssociateCompanyMiddleware {
  public createAssociateCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { name, email, phone, location } = req.body;
    if (!name || !email || !phone || !location) {
      res
        .status(400)
        .json({
          message:
            "All fields (name, email, phone, location) must be provided.",
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
    const { name, email, phone, location } = req.body;
    if (!name && !email && !phone && !location) {
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
