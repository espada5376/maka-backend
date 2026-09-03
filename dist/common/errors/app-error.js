export class AppError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
