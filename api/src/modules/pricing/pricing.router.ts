import { Router } from "express";
import * as pricing from "./pricing.service";

const router = Router();

router.get("/catalog", (_req, res, next) => {
  try {
    res.json(pricing.getPricingCatalog());
  } catch (e) {
    next(e);
  }
});

export default router;
