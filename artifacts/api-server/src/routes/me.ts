import { Router } from "express";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const meRouter = Router();

meRouter.use("/me", requireAuth);

// GET /api/me — return only the authenticated Clerk user ID.
meRouter.get("/me", (req, res) => {
  res.json({ userId: authenticatedUserId(req) });
});

export default meRouter;