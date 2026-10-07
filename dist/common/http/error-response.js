import multer from "multer";
import { AppError } from "../errors/app-error.js";
export function mapErrorToHttpResponse(error) {
    if (error instanceof AppError) {
        return {
            statusCode: error.statusCode,
            body: {
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            },
        };
    }
    if (error instanceof multer.MulterError) {
        return mapMulterError(error);
    }
    return {
        statusCode: 500,
        body: {
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Internal server error",
            },
        },
    };
}
function mapMulterError(error) {
    if (error.code === "LIMIT_FILE_SIZE") {
        return {
            statusCode: 400,
            body: {
                success: false,
                error: {
                    code: "IMAGE_TOO_LARGE",
                    message: "Image file exceeds the maximum size of 5 MB",
                },
            },
        };
    }
    return {
        statusCode: 400,
        body: {
            success: false,
            error: {
                code: "INVALID_IMAGE_UPLOAD",
                message: error.message,
            },
        },
    };
}
