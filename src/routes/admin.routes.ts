import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/rbacMiddleware";
import { UserRole } from "../entities/User";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();
const adminController = new AdminController();

adminRoutes.get(
  "/ping",
  authMiddleware,
  authorize(UserRole.ADMIN),
  asyncHandler(adminController.ping)
);

export { adminRoutes };
