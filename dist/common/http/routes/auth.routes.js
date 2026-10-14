import { Router } from "express";
export function createAuthRouter(authController) {
    const router = Router();
    router.post("/otp/request", authController.requestOtp.bind(authController));
    router.post("/otp/verify", authController.verifyOtp.bind(authController));
    return router;
}
