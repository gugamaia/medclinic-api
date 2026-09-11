import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { asyncHandler } from "../utils/asyncHandler";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post("/register", asyncHandler(authController.register));
authRoutes.post("/login", asyncHandler(authController.login));

export { authRoutes };
