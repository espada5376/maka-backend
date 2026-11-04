import type { SessionService } from "./services/session.service.js";
import type { UserController } from "./controllers/user.controller.js";
import type { StoreController } from "./controllers/store.controller.js";
import type { AuthController } from "./controllers/auth.controller.js";
import type { ProductController } from "./controllers/product.controller.js";
import type { ProductImageController } from "./controllers/product-image.controller.js";
import type { CartController } from "./controllers/cart.controller.js";
import type { OrderController } from "./controllers/order.controller.js";
import type { CategoryController } from "./controllers/category.controller.js";
import type { EventController } from "./controllers/event.controller.js";
import type { NotificationController } from "./controllers/notification.controller.js";

export interface AppDependencies {
  sessionService: SessionService;
  userController: UserController;
  storeController: StoreController;
  authController: AuthController;
  cartController: CartController;
  orderController: OrderController;
  productController: ProductController;
  productImageController: ProductImageController;
  categoryController: CategoryController;
  eventController: EventController;
  notificationController: NotificationController;
}
