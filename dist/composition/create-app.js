import db from "../database/knex.js";
import { UserRepository } from "../database/repositories/user.repository.js";
import { OtpRepository } from "../database/repositories/otp.repository.js";
import { OtpDeliveryRepository } from "../database/repositories/otp-delivery.repository.js";
import { SessionRepository } from "../database/repositories/session.repository.js";
import { StoreRepository } from "../database/repositories/store.repository.js";
import { ProductImageRepository } from "../database/repositories/product-image.repository.js";
import { ProductRepository } from "../database/repositories/product.repository.js";
import { CategoryRepository } from "../database/repositories/category.repository.js";
import { UserService } from "../services/user.service.js";
import { StoreService } from "../services/store.service.js";
import { SessionService } from "../services/session.service.js";
import { OtpService } from "../services/otp.service.js";
import { PhoneService } from "../services/phone.service.js";
import { OtpCryptoService } from "../services/otp-crypto.service.js";
import { ProductImageService } from "../services/product-image.service.js";
import { ProductService } from "../services/product.service.js";
import { UserController } from "../controllers/user.controller.js";
import { StoreController } from "../controllers/store.controller.js";
import { AuthController } from "../controllers/auth.controller.js";
import { ProductImageController } from "../controllers/product-image.controller.js";
import { ProductController } from "../controllers/product.controller.js";
import { SharpImageProcessor } from "../image-processing/SharpImageProcessor.js";
import { R2ImageStorage } from "../storage/R2ImageStorage.js";
import { getR2Config } from "../storage/config/r2.config.js";
import { createApp } from "../app.js";
export function createConfiguredApp() {
    const sessionRepository = new SessionRepository(db);
    const userRepository = new UserRepository(db);
    const storeRepository = new StoreRepository(db);
    const productRepository = new ProductRepository(db);
    const productImageRepository = new ProductImageRepository(db);
    const categoryRepository = new CategoryRepository(db);
    const phoneService = new PhoneService();
    const sessionService = new SessionService(sessionRepository);
    const userService = new UserService(userRepository, phoneService);
    const storeService = new StoreService(db, storeRepository, sessionRepository);
    const otpService = new OtpService(new OtpRepository(db), db, new OtpCryptoService(), new OtpDeliveryRepository(db), userRepository, sessionRepository, phoneService);
    const productService = new ProductService(db, productRepository, sessionRepository, storeRepository, categoryRepository);
    const productImageService = new ProductImageService(productImageRepository, sessionRepository, productRepository, storeRepository, new SharpImageProcessor(), new R2ImageStorage(getR2Config()));
    return createApp({
        sessionService,
        userController: new UserController(userService),
        storeController: new StoreController(storeService),
        authController: new AuthController(otpService),
        productController: new ProductController(productService),
        productImageController: new ProductImageController(productImageService),
    });
}
