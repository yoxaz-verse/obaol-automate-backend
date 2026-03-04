import { Request, Response, NextFunction } from "express";
import { t } from "./i18n";

interface ResponseFormat {
  success: boolean;
  data?: any;
  message?: string;
  error?: any;
}

export const formatResponse = (
  success: boolean,
  data: any = null,
  message: string = "",
  error: any = null
): ResponseFormat => {
  var data = { ...data };

  return {
    success,
    data,
    message,
    error,
  };
};

export const formatArrayResponse = (
  success: boolean,
  data: any = null,
  message: string = "",
  error: any = null
): ResponseFormat => {
  return {
    success,
    data,
    message,
    error,
  };
};

declare global {
  namespace Express {
    interface Response {
      sendFormatted: (data: any, message?: string, status?: number) => void;
      sendArrayFormatted: (
        data: any,
        message?: string,
        status?: number
      ) => void;
      sendError: (error: any, message?: string, status?: number) => void;
    }
  }
}

export const responseFormatter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const lang = req.language || "en";

  res.sendFormatted = (
    data: any,
    message: string = "",
    status: number = 200
  ) => {
    const translatedMessage = message ? t(message, lang) : "";
    res.status(status).json(formatResponse(true, data, translatedMessage));
  };

  res.sendArrayFormatted = (
    data: any,
    message: string = "",
    status: number = 200
  ) => {
    const translatedMessage = message ? t(message, lang) : "";
    res.status(status).json(formatArrayResponse(true, data, translatedMessage));
  };

  res.sendError = (error: any, message: string = "", status: number = 500) => {
    const translatedMessage = message ? t(message, lang) : "";
    res.status(status).json(formatResponse(false, null, translatedMessage, error));
  };

  next();
};
