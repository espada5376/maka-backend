import { Router } from "express";
import { StoreController } from "../controllers/store.controller.js";
export function createStoreRouter(storeController = new StoreController()) {
    const router = Router();
    router.post("/", storeController.create.bind(storeController));
    router.get("/owner/:ownerId", storeController.getByOwnerId.bind(storeController));
    router.get("/:id", storeController.getById.bind(storeController));
    router.patch("/:id", storeController.update.bind(storeController));
    router.patch("/:id/activate", storeController.activate.bind(storeController));
    router.patch("/:id/deactivate", storeController.deactivate.bind(storeController));
    return router;
}
