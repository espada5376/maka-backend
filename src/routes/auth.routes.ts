import { Router } from "express";

import { AuthController } from "../controllers/auth.controller.js";

export function createAuthRouter(
  authController: AuthController = new AuthController(),
) {
  const router = Router();

  router.post(
    "/otp/request",
    authController.requestOtp.bind(authController),
  );

  router.post(
    "/otp/verify",
    authController.verifyOtp.bind(authController),
  );

  return router;
}
