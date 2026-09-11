import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { userRoutes } from "./user.routes";
import { adminRoutes } from "./admin.routes";

const routes = Router();

routes.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/admin", adminRoutes);

export { routes };
