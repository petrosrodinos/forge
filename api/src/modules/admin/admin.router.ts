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

router.delete("/users/:id", (req, res, next) => {
  admin
    .deleteUserAndAssets(req.userId, req.params.id)
    .then(() => res.status(204).send())
    .catch(next);
});

export default router;
