import { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
        interface Request {
            language: string;
        }
    }
}

export const localizationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Priority: Header > Cookie > Default (en)
    const langHeader = req.headers["x-language"] as string;
    const langCookie = req.cookies?.language;

    req.language = langHeader || langCookie || "en";

    // Standardize to lowercase and 2 characters if needed (e.g., 'en-US' -> 'en')
    if (req.language) {
        req.language = req.language.split("-")[0].toLowerCase();
    }

    next();
};
