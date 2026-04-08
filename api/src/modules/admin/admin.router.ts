import { Router } from "express";
import { z } from "zod";
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

const updateAdminUserBodySchema = z.object({
  email: z.string().trim().email(),
  displayName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => {
      if (value == null) return null;
      return value.length > 0 ? value : null;
    }),
  role: z.enum(["USER", "ADMIN"]),
  tokenBalance: z.number().int().min(0),
});

router.put("/users/:id", (req, res, next) => {
  const parsed = updateAdminUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  admin
    .updateUserByAdmin(req.userId, req.params.id, parsed.data)
    .then((out) => res.json(out))
    .catch(next);
});

router.delete("/users/:id", (req, res, next) => {
  admin
    .deleteUserAndAssets(req.userId, req.params.id)
    .then(() => res.status(204).send())
    .catch(next);
});

export default router;
