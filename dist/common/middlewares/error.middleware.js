import { AppError } from "../errors/app-error.js";
export function errorMiddleware(error, _req, res, _next) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });
    }
    console.error(error);
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
        },
    });
}
