import { Router } from "express";
import {
  getTradeDirectoryCommodity,
  listTradeDirectoryCommodities,
} from "../../controllers/tradeDirectoryController";

const router = Router();

router.get("/trade-directory/commodities", listTradeDirectoryCommodities);
router.get("/trade-directory/commodities/:slug", getTradeDirectoryCommodity);

export default router;
