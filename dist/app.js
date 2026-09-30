import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./common/middlewares/error.middleware.js";
import { createSessionMiddleware } from "./common/middlewares/session.middleware.js";
import { SessionService } from "./services/session.service.js";
export function createApp(sessionService = new SessionService()) {
    const app = express();
    app.use(helmet());
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(createSessionMiddleware(sessionService));
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
