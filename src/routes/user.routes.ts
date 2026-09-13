import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const userRoutes = Router();
const userController = new UserController();

userRoutes.get("/me", authMiddleware, asyncHandler(userController.me));

export { userRoutes };
