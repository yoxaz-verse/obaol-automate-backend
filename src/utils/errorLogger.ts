import { Request } from "express";
import { NODE_ENV } from "../config";
import { ErrorModel } from "../database/models/error";

export const logError = async (
  error: any,
  req: Request,
  location: string = ""
) => {
  const errorDetails = {
    message: error.message || "An error occurred",
    stack: error.stack || "",
    resolved: false,
    stage: NODE_ENV || "unknown",
    api: `${req.method} ${req.protocol}://${req.get("host")}${
      req.originalUrl || req.url
    }`,
    location: location,
    body: req.body ?? {},
  };

  if (NODE_ENV === "development") {
    console.error("Error:", error);
    console.error("Error Message:", errorDetails.message);
    console.error("Stack Trace:", errorDetails.stack);
    const newError = new ErrorModel(errorDetails);
    await newError.save();
  } else {
    const newError = new ErrorModel(errorDetails);
    await newError.save();
  }
};
