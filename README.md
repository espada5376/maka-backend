# Maka Backend

The backend API powering **Maka**, a lightweight e-commerce platform designed to help merchants manage and grow their online businesses.

Maka aims to help merchants move through a continuous cycle:

**Sell → Observe → Understand → Improve → Sell more.**

This repository contains the server-side application, business logic, data persistence and supporting services.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Backend framework:** Express 5
- **Database:** PostgreSQL
- **Query builder:** Knex.js
- **Testing:** Vitest
- **Image processing:** Sharp
- **Object storage:** Cloudflare R2 (AWS S3-compatible API)
- **Authentication:** Phone number verification with OTP
- **Messaging:** WhatsApp integration through Genuka

## Architecture

The backend follows a layered architecture with separation of responsibilities.

```text
HTTP Request
     |
     v
Routes
     |
     v
Controllers
     |
     v
Services
     |
     v
Repositories
     |
     v
PostgreSQL
```

The application uses dependency composition to instantiate and connect its components.

### Project Structure

```text
src/
├── common/
│   ├── errors/
│   ├── http/
│   │   ├── routes/
│   │   └── validation/
│   └── middlewares/
├── composition/
├── config/
├── controllers/
├── database/
│   ├── migrations/
│   └── repositories/
├── image-processing/
├── insights/
│   └── rules/
├── notifications/
│   ├── config/
│   ├── factories/
│   ├── providers/
│   └── types/
├── services/
├── storage/
└── server.ts
```

## Features

The backend currently includes the following capabilities:

- **Authentication:** phone number verification using one-time passwords (OTP).
- **Session management:** session-based identity management.
- **User management:** user profile retrieval and updates.
- **Store management:** store creation, retrieval, updates and activation controls.
- **Product management:** product creation, retrieval, updates, availability management and archiving.
- **Product images:** image uploads, processing and storage.
- **Shopping cart:** session-based cart management.
- **Orders:** order creation, retrieval and seller-side status updates.
- **Categories:** category retrieval and administration.
- **Notifications:** notification management and background delivery workers.
- **Events and insights:** event recording and business insight calculation.

Some integrations and workflows are still being developed.

## API Overview

All application endpoints use the `/api/v1` prefix.

| Resource       | Main endpoints                                    |
| -------------- | ------------------------------------------------- |
| Authentication | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Users          | `/users`                                          |
| Stores         | `/stores`                                         |
| Products       | `/products`                                       |
| Product images | `/products/:productId/images`                     |
| Cart           | `/cart`                                           |
| Orders         | `/orders`                                         |
| Categories     | `/categories`                                     |
| Events         | `/events`                                         |
| Notifications  | `/notifications`                                  |

Health check:

```http
GET /api/health
```

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- npm
- A configured Cloudflare R2 bucket for image storage
- Genuka WhatsApp credentials for WhatsApp OTP delivery

### Installation

Clone the repository:

```bash
git clone https://github.com/espada5376/maka-backend.git
cd maka-backend
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root.

The application uses the following environment configuration:

```env
NODE_ENV=development
PORT=5000

FRONTEND_URL=http://localhost:5173

DATABASE_URL=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maka
DB_USER=
DB_PASSWORD=

ADMIN_API_KEY=

OTP_HASH_SECRET=
OTP_ENCRYPTION_KEY=

GENUKA_WA_API_KEY=
GENUKA_WA_BASE_URL=
GENUKA_WA_CONNECTION_ID=
```

Use the database connection configuration supported by the application. Do not commit credentials or secret keys to version control.

Cloudflare R2 credentials must also be configured according to the storage configuration.

### Database Migrations

Run the database migrations:

```bash
npm run migrate
```

### Run the Development Server

```bash
npm run dev
```

The API will run on the configured port (5000 by default).

### Build for Production

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Test database configuration can be provided separately using the `TEST_DB_*` environment variables where required by the test setup.

## Current Development Status

Maka is an actively developed project.

The backend is being built incrementally, with an emphasis on:

- Clear separation of concerns.
- Maintainable TypeScript code.
- Consistent API contracts.
- Session and identity management.
- Reliable data persistence.
- Automated testing.

## Related Repository

The frontend application is available here:

[Maka Frontend](https://github.com/espada5376/maka-frontend)

## License

This repository declares the ISC license.ezechiel\@ezechiel-HP-Notebook:\~/maka-backend$ cd \~/maka-backend
echo "=== ROUTE FILES ==="
for file in src/common/http/routes/\*.ts; do
echo ""
echo "===== $file ====="
cat "$file"
done
\=== ROUTE FILES ===
\===== src/common/http/routes/auth.routes.ts =====
import { Router } from "express";
import { AuthController } from "../../../controllers/auth.controller.js";
export function createAuthRouter(
authController: AuthController,
) {
const router = Router();
router.post("/otp/request", authController.requestOtp.bind(authController));
router.post("/otp/verify", authController.verifyOtp.bind(authController));
return router;
}
\===== src/common/http/routes/cart.routes.ts =====
import { Router } from "express";
import { CartController } from "../../../controllers/cart.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
addCartItemSchema,
cartItemIdParamsSchema,
updateCartItemQuantitySchema,
} from "../../http/validation/cart.schemas.js";
export function createCartRouter(cartController: CartController) {
const router = Router();
router.get("/", asyncHandler(cartController.getCart.bind(cartController)));
router.post(
"/items",
validateBody(addCartItemSchema),
asyncHandler(cartController.addItem.bind(cartController)),
);
router.patch(
"/items/",
validateParams(cartItemIdParamsSchema),
validateBody(updateCartItemQuantitySchema),
asyncHandler(cartController.updateItemQuantity.bind(cartController)),
);
router.delete(
"/items/",
validateParams(cartItemIdParamsSchema),
asyncHandler(cartController.removeItem.bind(cartController)),
);
return router;
}
\===== src/common/http/routes/category.routes.ts =====
import { Router } from "express";
import { requireAdminKey } from "../../middlewares/require-admin-key.middleware.js";
import { CategoryController } from "../../../controllers/category.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
categoryIdParamsSchema,
categorySlugParamsSchema,
createCategorySchema,
updateCategorySchema,
} from "../../http/validation/category.schemas.js";
export function createCategoryRouter(
controller: CategoryController,
) {
const router = Router();
router.get(
"/",
asyncHandler(controller.getRootCategories.bind(controller)),
);
router.get(
"/slug/",
validateParams(categorySlugParamsSchema),
asyncHandler(controller.getBySlug.bind(controller)),
);
router.get(
"//children",
validateParams(categoryIdParamsSchema),
asyncHandler(controller.getChildren.bind(controller)),
);
router.get(
"/",
validateParams(categoryIdParamsSchema),
asyncHandler(controller.getById.bind(controller)),
);
router.post(
"/",
requireAdminKey,
validateBody(createCategorySchema),
asyncHandler(controller.create.bind(controller)),
);
router.patch(
"/",
requireAdminKey,
validateParams(categoryIdParamsSchema),
validateBody(updateCategorySchema),
asyncHandler(controller.update.bind(controller)),
);
return router;
}
\===== src/common/http/routes/event.routes.ts =====
import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { validateBody } from "../../http/validation/validate.js";
import { createEventSchema } from "../../http/validation/event.schemas.js";
import { EventController } from "../../../controllers/event.controller.js";
export function createEventRouter(
eventController: EventController,
): Router {
const router = Router();
router.post(
"/",
validateBody(createEventSchema),
asyncHandler(eventController.record.bind(eventController)),
);
return router;
}
\===== src/common/http/routes/notification.routes.ts =====
import { Router } from "express";
import { NotificationController } from "../../../controllers/notification.controller.js";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";
import { asyncHandler } from "../../http/async-handler.js";
export function createNotificationRouter(
notificationController: NotificationController,
): Router {
const router = Router();
router.use(requireAuth);
router.get(
"/",
asyncHandler(notificationController.getAll.bind(notificationController)),
);
router.get(
"/unread-count",
asyncHandler(
notificationController.getUnreadCount.bind(notificationController),
),
);
router.patch(
"/read-all",
asyncHandler(
notificationController.markAllAsRead.bind(notificationController),
),
);
router.patch(
"//read",
asyncHandler(
notificationController.markAsRead.bind(notificationController),
),
);
return router;
}
\===== src/common/http/routes/order.routes.ts =====
import { Router } from "express";
import { OrderController } from "../../../controllers/order.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import { validateIdempotencyKey } from "../../middlewares/idempotency-key.middleware.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
createOrderSchema,
createDirectOrderSchema,
orderIdParamsSchema,
storeOrderParamsSchema,
storeOrderDetailParamsSchema,
updateOrderStatusSchema,
} from "../../http/validation/order.schemas.js";
export function createOrderRouter(orderController: OrderController) {
const router = Router();
router.post(
"/orders",
validateIdempotencyKey,
validateBody(createOrderSchema),
asyncHandler(orderController.createFromCart.bind(orderController)),
);
router.post(
"/orders/direct",
validateIdempotencyKey,
validateBody(createDirectOrderSchema),
asyncHandler(orderController.createDirect.bind(orderController)),
);
router.get(
"/orders",
asyncHandler(
orderController.getForCurrentBuyer.bind(orderController),
),
);
router.get(
"/orders/",
validateParams(orderIdParamsSchema),
asyncHandler(
orderController.getForCurrentBuyerById.bind(orderController),
),
);
router.get(
"/stores//orders",
validateParams(storeOrderParamsSchema),
asyncHandler(orderController.getForSeller.bind(orderController)),
);
router.patch(
"/stores//orders//status",
validateParams(storeOrderDetailParamsSchema),
validateBody(updateOrderStatusSchema),
asyncHandler(
orderController.updateStatusBySeller.bind(orderController),
),
);
return router;
}
\===== src/common/http/routes/product-image.routes.ts =====
import { Router } from "express";
import { ProductImageController } from "../../../controllers/product-image.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
productImageParamsSchema,
reorderProductImagesSchema,
} from "../../http/validation/product-image.schemas.js";
import { uploadImage } from "../../middlewares/upload-image.middleware.js";
export function createProductImageRouter(
productImageController: ProductImageController,
) {
const router = Router();
router.post(
"//images",
validateParams(productImageParamsSchema),
uploadImage.single("image"),
asyncHandler(
productImageController.create.bind(productImageController),
),
);
router.put(
"//images/order",
validateParams(productImageParamsSchema),
validateBody(reorderProductImagesSchema),
asyncHandler(
productImageController.reorder.bind(productImageController),
),
);
return router;
}
\===== src/common/http/routes/product.routes.ts =====
import { Router } from "express";
import { ProductController } from "../../../controllers/product.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
createProductSchema,
productCategoryIdParamsSchema,
productIdParamsSchema,
productStoreIdParamsSchema,
setProductAvailabilitySchema,
updateProductSchema,
} from "../../http/validation/product.schemas.js";
export function createProductRouter(
productController: ProductController,
) {
const router = Router();
router.post(
"/",
validateBody(createProductSchema),
asyncHandler(
productController.create.bind(productController),
),
);
router.get(
"/store//available",
validateParams(productStoreIdParamsSchema),
asyncHandler(
productController.getAvailableByStore.bind(
productController,
),
),
);
router.get(
"/store/",
validateParams(productStoreIdParamsSchema),
asyncHandler(
productController.getByStore.bind(productController),
),
);
router.get(
"/category/",
validateParams(productCategoryIdParamsSchema),
asyncHandler(
productController.getByCategory.bind(productController),
),
);
router.get(
"/",
validateParams(productIdParamsSchema),
asyncHandler(
productController.getById.bind(productController),
),
);
router.patch(
"/",
validateParams(productIdParamsSchema),
validateBody(updateProductSchema),
asyncHandler(
productController.update.bind(productController),
),
);
router.patch(
"//availability",
validateParams(productIdParamsSchema),
validateBody(setProductAvailabilitySchema),
asyncHandler(
productController.setAvailability.bind(
productController,
),
),
);
router.patch(
"//archive",
validateParams(productIdParamsSchema),
asyncHandler(
productController.archive.bind(productController),
),
);
router.patch(
"//unarchive",
validateParams(productIdParamsSchema),
asyncHandler(
productController.unarchive.bind(productController),
),
);
return router;
}
\===== src/common/http/routes/store.routes.ts =====
import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";
import { StoreController } from "../../../controllers/store.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
validateBody,
validateParams,
} from "../../http/validation/validate.js";
import {
createStoreSchema,
storeIdParamsSchema,
storeOwnerIdParamsSchema,
updateStoreSchema,
} from "../../http/validation/store.schemas.js";
export function createStoreRouter(
storeController: StoreController,
) {
const router = Router();
router.post(
"/",
validateBody(createStoreSchema),
asyncHandler(
storeController.create.bind(storeController),
),
);
router.get(
"/owner/",
validateParams(storeOwnerIdParamsSchema),
asyncHandler(
storeController.getByOwnerId.bind(storeController),
),
);
router.get(
"/me",
requireAuth,
asyncHandler(storeController.getMe.bind(storeController)),
);
router.get(
"/",
validateParams(storeIdParamsSchema),
asyncHandler(
storeController.getById.bind(storeController),
),
);
router.patch(
"/",
validateParams(storeIdParamsSchema),
validateBody(updateStoreSchema),
asyncHandler(
storeController.update.bind(storeController),
),
);
router.patch(
"//activate",
validateParams(storeIdParamsSchema),
asyncHandler(
storeController.activate.bind(storeController),
),
);
router.patch(
"//deactivate",
validateParams(storeIdParamsSchema),
asyncHandler(
storeController.deactivate.bind(storeController),
),
);
return router;
}
\===== src/common/http/routes/user.routes.ts =====
import { Router } from "express";
import { validateBody, validateParams } from "../validation/validate.js";
import { asyncHandler } from "../async-handler.js";
import { UserController } from "../../../controllers/user.controller.js";
import {
updateUserSchema,
userIdParamsSchema,
} from "../validation/user.schemas.js";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";
export function createUserRouter(
userController: UserController,
) {
const router = Router();
router.get(
"/me",
requireAuth,
asyncHandler(userController.getMe.bind(userController)),
);
router.patch(
"/me",
requireAuth,
validateBody(updateUserSchema),
asyncHandler(userController.updateMe.bind(userController)),
);
router.get(
"/",
validateParams(userIdParamsSchema),
asyncHandler(userController.getById.bind(userController)),
);
router.patch(
"/",
validateParams(userIdParamsSchema),
validateBody(updateUserSchema),
asyncHandler(userController.update.bind(userController)),
);
return router;
}
ezechiel\@ezechiel-HP-Notebook:\~/maka-backend$ cd ..
ezechiel\@ezechiel-HP-Notebook:\~$ cd \~/maka-frontend
echo "=== FRONTEND ROUTER ==="
cat src/app/router.tsx
echo "=== APP ENTRY ==="
cat src/app/App.tsx
echo "=== SERVICE FILES ==="
for file in src/services/\*.ts; do
echo ""
echo "===== $file ====="
cat "$file"
done
\=== FRONTEND ROUTER ===
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { FeedPage } from "@/pages/FeedPage";
import { ProductPage } from "@/pages/products/ProductPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccessPage";
import { CartPage } from "@/pages/CartPage";
import { SearchPage } from "@/pages/SearchPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AccountLoginPage } from "@/pages/AccountLoginPage";
import { AccountCreatePage } from "@/pages/AccountCreatePage";
import { AccountVerifyPage } from "@/pages/AccountVerifyPage";
import { SellPage } from "@/pages/SellPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { SellerDashboardPage } from "@/pages/seller/SellerDashboardPage";
import { SellerProductsPage } from "@/pages/seller/SellerProductsPage";
import { NewProductPage } from "@/pages/seller/NewProductPage";
import { EditProductPage } from "@/pages/seller/EditProductPage";
import { SellerOnboardingSuccessPage } from "@/pages/seller/SellerOnboardingSuccessPage";
import { SellerOnboardingStorePage } from "@/pages/seller/SellerOnboardingStorePage";
import { SellerOnboardingProductPage } from "@/pages/seller/SellerOnboardingProductPage";
import { SellerOnboardingPublishPage } from "@/pages/seller/SellerOnboardingPublishPage";
import { PublicLayout } from "@/layouts/PublicLayout";
import { SellerLayout } from "@/layouts/SellerLayout";
import { RequireSellerGuard } from "@/guards/RequireSellerGuard";
import { IdentityGate } from "@/guards/IdentityGate";
import { AccountGuard } from "@/guards/AccountGuard";
import { SellerGuard } from "@/guards/SellerGuard";
export const router = createBrowserRouter([
/\*
Public
\*/
{
element: \<PublicLayout />,
children: [
{
path: "/landing",
element: \<LandingPage />,
},
{
path: "/notifications",
element: \<NotificationsPage />,
},
{
path: "/search",
element: \<SearchPage />,
},
{
path: "/",
element: \<Navigate to="/feed" replace />,
},
{
path: "/feed",
element: \<FeedPage />,
},
{
path: "/p/",
element: \<ProductPage />,
},
{
path: "/cart",
element: \<CartPage />,
},
/\*
Checkout
\*/
{
path: "/checkout",
element: \<CheckoutPage />,
},
{
path: "/order/",
element: \<CheckoutPage />,
},
{
path: "/checkout/success",
element: \<CheckoutSuccessPage />,
},
/\*
Identity
\*/
{
path: "/account/login",
element: \<AccountLoginPage />,
},
{
path: "/account/verify",
element: \<AccountVerifyPage />,
},
{
path: "/profile",
element: \<div>Profile\</div>,
},
/\*
Seller acquisition
\*/
{
path: "/sell",
element: \<SellPage />,
},
/\*
Buyer orders
\*/
{
element: \<IdentityGate purpose="view_orders" />,
children: [
{
path: "/orders",
element: \<OrdersPage />,
},
{
path: "/orders/",
element: \<OrderDetailPage />,
},
],
},
],
},
/\*
Protected routes
\*/
{
element: \<AccountGuard />,
children: [
{
path: "/account/create",
element: \<AccountCreatePage />,
},
/\*
Seller onboarding
\*/
{
element: \<SellerGuard />,
children: [
{
path: "/seller/onboarding/store",
element: \<SellerOnboardingStorePage />,
},
{
path: "/seller/onboarding/first-product",
element: \<SellerOnboardingProductPage />,
},
{
path: "/seller/onboarding/publish",
element: \<SellerOnboardingPublishPage />,
},
{
path: "/seller/onboarding/success",
element: \<SellerOnboardingSuccessPage />,
},
],
},
/\*
Seller application
\*/
{
element: \<RequireSellerGuar
