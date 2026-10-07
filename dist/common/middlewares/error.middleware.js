import { mapErrorToHttpResponse } from "../http/error-response.js";
export function errorMiddleware(error, _req, res, _next) {
    const response = mapErrorToHttpResponse(error);
    if (response.statusCode >= 500) {
        console.error(error);
    }
    res.status(response.statusCode).json(response.body);
}
