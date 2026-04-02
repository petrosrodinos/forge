import { Router } from "express";
import {
  getTaskController,
  meshFromImageUrlController,
  prerigCheckController,
  proxyModelController,
  startRetargetController,
  startRigController,
} from "./tripo.controller";

const router = Router();

router.post("/proxy-model", proxyModelController);
router.get("/task/:id", getTaskController);
router.post("/mesh-from-image-url", meshFromImageUrlController);
router.post("/prerig-check", prerigCheckController);
router.post("/start-rig", startRigController);
router.post("/start-retarget", startRetargetController);

export default router;

