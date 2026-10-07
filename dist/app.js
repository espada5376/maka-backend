import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ProductImageController } from "./controllers/product-image.controller.js";
import { createProductImageRouter } from "./routes/product-image.routes.js";
import { StoreController } from "./controllers/store.controller.js";
import { createStoreRouter } from "./routes/store.routes.js";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { createSessionMiddleware } from "./common/middlewares/session.middleware.js";
import { SessionService } from "./services/session.service.js";
import { UserController } from "./controllers/user.controller.js";
import { createUserRouter } from "./routes/user.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { AuthController } from "./controllers/auth.controller.js";
import { ProductImageRepository } from "./database/repositories/product-image.repository.js";
import { ProductRepository } from "./database/repositories/product.repository.js";
import { StoreRepository } from "./database/repositories/store.repository.js";
import { SessionRepository } from "./database/repositories/session.repository.js";
import { ProductImageService } from "./services/product-image.service.js";
import { SharpImageProcessor } from "./image-processing/SharpImageProcessor.js";
import { R2ImageStorage } from "./storage/R2ImageStorage.js";
import { getR2Config } from "./storage/config/r2.config.js";
export function createApp(sessionService = new SessionService(), userController = new UserController(), storeController = new StoreController(), authController = new AuthController()) {
    const app = express();
    /*
     * Product images dependencies
     */
    const productImageRepository = new ProductImageRepository();
    const productRepository = new ProductRepository();
    const storeRepository = new StoreRepository();
    const sessionRepository = new SessionRepository();
    const imageProcessor = new SharpImageProcessor();
    const imageStorage = new R2ImageStorage(getR2Config());
    const productImageService = new ProductImageService(productImageRepository, imageProcessor, imageStorage);
    const productImageController = new ProductImageController(productImageService);
    app.use(helmet());
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(createSessionMiddleware(sessionService));
    app.use("/api/v1/users", createUserRouter(userController));
    app.use("/api/v1/stores", createStoreRouter(storeController));
    app.use("/api/v1/auth", createAuthRouter(authController));
    app.use("/api/v1/products", createProductImageRouter(productImageController));
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
