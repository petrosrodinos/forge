import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireAdmin } from "../../middleware/requireAdmin";
import * as admin from "./admin.service";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/metrics", (_req, res, next) => {
  admin.getAdminMetrics().then((out) => res.json(out)).catch(next);
});

router.get("/users", (_req, res, next) => {
  admin.listUsersForAdmin().then((out) => res.json(out)).catch(next);
});

export default router;
