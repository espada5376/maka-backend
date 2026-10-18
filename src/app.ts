import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import type { AppDependencies } from "./AppDependencies.ts";

import { createUserRouter } from "./common/http/routes/user.routes.js";
import { createStoreRouter } from "./common/http/routes/store.routes.js";
import { createAuthRouter } from "./common/http/routes/auth.routes.js";
import { createProductImageRouter } from "./common/http/routes/product-image.routes.js";
import { createProductRouter } from "./common/http/routes/product.routes.js";
import { createCartRouter } from "./common/http/routes/cart.routes.js";
import { createOrderRouter } from "./common/http/routes/order.routes.js";

import { createSessionMiddleware } from "./common/middlewares/session.middleware.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";

export function createApp(dependencies: AppDependencies) {
  const app = express();

  // Sécurité et configuration HTTP
  app.use(helmet());

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Parsing des requêtes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Session
  app.use(createSessionMiddleware(dependencies.sessionService));

  // Routeurs
  app.use("/api/v1/users", createUserRouter(dependencies.userController));

  app.use("/api/v1/stores", createStoreRouter(dependencies.storeController));

  app.use("/api/v1/auth", createAuthRouter(dependencies.authController));

  app.use(
    "/api/v1/products",
    createProductRouter(dependencies.productController),
  );

  app.use(
    "/api/v1/products",
    createProductImageRouter(dependencies.productImageController),
  );

  app.use("/api/v1/cart", createCartRouter(dependencies.cartController));
  app.use("/api/v1", createOrderRouter(dependencies.orderController));

  // Santé de l'API
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Maka API is running",
    });
  });

  // Gestion globale des erreurs : après les routes
  app.use(errorMiddleware);

  return app;
}
