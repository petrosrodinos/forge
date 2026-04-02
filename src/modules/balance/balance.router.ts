import { Router } from "express";
import {
  getAimlBalanceController,
  getTripoBalanceController,
} from "./balance.controller";

const router = Router();

router.get("/aiml", getAimlBalanceController);
router.get("/tripo", getTripoBalanceController);

export default router;

