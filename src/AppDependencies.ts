import type { SessionService } from "./services/session.service.js";
import type { UserController } from "./controllers/user.controller.js";
import type { StoreController } from "./controllers/store.controller.js";
import type { AuthController } from "./controllers/auth.controller.js";
import type { ProductController } from "./controllers/product.controller.js";
import type { ProductImageController } from "./controllers/product-image.controller.js";

export interface AppDependencies {
  sessionService: SessionService;
  userController: UserController;
  storeController: StoreController;
  authController: AuthController;
  productController: ProductController;
  productImageController: ProductImageController;
}
