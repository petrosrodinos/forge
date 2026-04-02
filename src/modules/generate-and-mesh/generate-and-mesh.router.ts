import { Router } from "express";
import { generateAndMeshController } from "./generate-and-mesh.controller";

const router = Router();

router.post("/generate-and-mesh", generateAndMeshController);

export default router;

