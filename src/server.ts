import "dotenv/config";
import express from "express";
import path from "path";
import { env } from "./config/env";
import { prisma } from "./db/client";
import { errorHandler } from "./middleware/errorHandler";

import chatRouter       from "./routes/chat";
import imagesRouter     from "./routes/images";
import balanceRouter    from "./routes/balance";
import tripoMeshRouter  from "./routes/tripoMesh";

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
app.use(express.static(path.join(__dirname, "../public")));
app.use(
  "/vendor/model-viewer",
  express.static(path.join(__dirname, "../node_modules/@google/model-viewer/dist"))
);

// Legacy / non-DB routes
app.use("/api/chat",    chatRouter);
app.use("/api/tripo",   tripoMeshRouter);
app.use("/api/aiml",    imagesRouter);
app.use("/api/balance", balanceRouter);

// DB-backed routes
app.use("/api/figures",                                                                figuresRouter);
app.use("/api/figures/:figureId/skins",                                                skinsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants",                               variantsRouter);
app.use("/api/figures/:figureId/skins/:skinId/variants/:variantId/images",             skinImagesRouter);
app.use("/api/models3d",                                                               models3dRouter);
app.use("/api/models3d/:model3dId/animations",                                         animationsRouter);
app.use("/api/pipeline",                                                               pipelineRouter);

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
