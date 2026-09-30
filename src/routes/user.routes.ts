import { Router } from "express";

import { UserController } from "../controllers/user.controller.js";

export function createUserRouter(
  userController: UserController = new UserController(),
) {
  const router = Router();

  router.get(
    "/:id",
    userController.getById.bind(userController),
  );

  router.post(
    "/",
    userController.create.bind(userController),
  );

  router.patch(
    "/:id",
    userController.update.bind(userController),
  );

  router.patch(
    "/:id/phone/verify",
    userController.markPhoneAsVerified.bind(
      userController,
    ),
  );

  return router;
}
