import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { StoreController } from "./controllers/store.controller.js";
import { createStoreRouter } from "./routes/store.routes.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { createSessionMiddleware } from "./common/middlewares/session.middleware.js";
import { SessionService } from "./services/session.service.js";
import { UserController } from "./controllers/user.controller.js";
import { createUserRouter } from "./routes/user.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { AuthController } from "./controllers/auth.controller.js";

export function createApp(
  sessionService: SessionService = new SessionService(),
  userController: UserController = new UserController(),
  storeController: StoreController = new StoreController(),
  authController: AuthController = new AuthController(),
) {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(createSessionMiddleware(sessionService));

  app.use("/api/v1/users", createUserRouter(userController));
  app.use(
  "/api/v1/stores",
  createStoreRouter(storeController),
);  

  app.use("/api/v1/auth", createAuthRouter(authController));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Maka API is running",
    });
  });

  app.use(errorMiddleware);

  return app;
}

const app = createApp();

export default app;
