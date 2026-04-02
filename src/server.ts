import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { prisma } from "./db/client";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";
import { OPEN_API_DOCUMENT } from "./docs/openapi";

import chatRouter from "./modules/chat/chat.router";
import imagesRouter from "./modules/images/images.router";
import balanceRouter from "./modules/balance/balance.router";
import tripoRouter from "./modules/tripo/tripo.router";
import generateAndMeshRouter from "./modules/generate-and-mesh/generate-and-mesh.router";

import authRouter      from "./modules/auth/auth.router";
import figuresRouter    from "./modules/figures/figures.router";
import skinsRouter      from "./modules/skins/skins.router";
import variantsRouter   from "./modules/skin-variants/skin-variants.router";
import skinImagesRouter from "./modules/skin-images/skin-images.router";
import models3dRouter   from "./modules/models3d/models3d.router";
import animationsRouter from "./modules/animations/animations.router";
import pipelineRouter   from "./modules/pipeline/pipeline.router";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use(
  "/vendor/model-viewer",
  express.static(path.join(__dirname, "../node_modules/@google/model-viewer/dist"))
);

// API docs
app.get("/api/openapi.json", (_req, res) => {
  res.json(OPEN_API_DOCUMENT);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(OPEN_API_DOCUMENT));

// Auth (public)
app.use("/api/auth", authRouter);

// Legacy / non-DB routes
app.use("/api/chat",    chatRouter);
app.use("/api/tripo",   tripoRouter);
app.use("/api/aiml",    imagesRouter);
app.use("/api/balance", balanceRouter);

// Generic endpoint aliases (replace /api/aiml/* and /api/tripo/mesh-from-image-url)
app.use("/api", imagesRouter); // exposes: /api/models, /api/generate
app.use("/api", tripoRouter); // exposes: /api/mesh-from-image-url and related endpoints

// Prompt -> image -> mesh (single step)
app.use("/api", generateAndMeshRouter); // exposes: /api/generate-and-mesh

// DB-backed routes (all require authentication)
app.use("/api/figures",                                                                requireAuth, figuresRouter);
app.use("/api/figures/:figureId/skins",                                                requireAuth, skinsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants",                               requireAuth, variantsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants/:variantId/images",             requireAuth, skinImagesRouter);
app.use("/api/models3d",                                                               requireAuth, models3dRouter);
app.use("/api/models3d/:model3dId/animations",                                         requireAuth, animationsRouter);
app.use("/api/pipeline",                                                               requireAuth, pipelineRouter);

app.use(errorHandler);

prisma.$connect()
  .then(() => {
    const server = app.listen(env.PORT, () => {
      console.log(`\n  ⬡  3D Figures — The Forge`);
      console.log(`     http://localhost:${env.PORT}\n`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n  [server] Port ${env.PORT} is already in use.\n`);
      } else {
        console.error("[server] error:", err);
      }
      process.exit(1);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

process.on("uncaughtException",  (err)    => { console.error("[server] uncaughtException:", err); process.exit(1); });
process.on("unhandledRejection", (reason) => { console.error("[server] unhandledRejection:", reason); });
