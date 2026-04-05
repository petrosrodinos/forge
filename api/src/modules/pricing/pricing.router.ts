import { Router } from "express";
import * as pricing from "./pricing.service";
import { buildPricingCosts } from "./pricing-costs";

const router = Router();

router.get("/catalog", (_req, res, next) => {
  try {
    res.json(pricing.getPricingCatalog());
  } catch (e) {
    next(e);
  }
});

router.get("/costs", (_req, res, next) => {
  try {
    res.json(buildPricingCosts());
  } catch (e) {
    next(e);
  }
});

export default router;
