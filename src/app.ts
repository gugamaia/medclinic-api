import express, { Application } from "express";
import { routes } from ".routs/index.js";
import { errorHandler } from ".errorHandler.js";

export function createApp(): Application {
  const app: Application = express();

  app.use(express.json());
  app.use(routes);
  app.use(errorHandler);

  return app;
}
