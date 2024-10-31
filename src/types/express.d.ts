// src/types/express.d.ts

import { IAdminAuth } from "../middlewares/auth";
// src/@types/express/index.d.ts

declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}
