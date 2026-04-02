import { Router } from "express";
import {
  generateImageController,
  listImageModelsController,
} from "./images.controller";

const router = Router();

router.get("/models", listImageModelsController);
router.post("/generate", generateImageController);

export default router;

