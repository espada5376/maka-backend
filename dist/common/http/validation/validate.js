import { createAppError } from "../../errors/create-app-error.js";
import { Errors } from "../../errors/errors.js";
export function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(createAppError(Errors.INVALID_REQUEST_BODY));
            return;
        }
        req.body = result.data;
        next();
    };
}
export function validateParams(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            next(createAppError(Errors.INVALID_REQUEST_PARAMS));
            return;
        }
        req.params = result.data;
        next();
    };
}
export function validateQuery(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            next(createAppError(Errors.INVALID_REQUEST_QUERY));
            return;
        }
        req.query = result.data;
        next();
    };
}
