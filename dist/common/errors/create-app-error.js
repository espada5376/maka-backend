import { AppError } from "./app-error.js";
export function createAppError(error) {
    return new AppError(error.code, error.message, error.statusCode);
}
