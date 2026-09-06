import express, { Application } from "express";
import { routes } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export function createApp(): Application {
  const app: Application = express();

  app.use(express.json());
  app.use(routes);
  app.use(errorHandler);

  return app;
}
