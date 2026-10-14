import { sendSuccess } from "../common/http/response.js";
export class ProductController {
    productService;
    constructor(productService) {
        this.productService = productService;
    }
    async create(req, res) {
        const product = await this.productService.create(req.session.id, req.body);
        sendSuccess(res, 201, product);
    }
    async getById(req, res) {
        const product = await this.productService.getById(req.params.id);
        sendSuccess(res, 200, product);
    }
    async getByStore(req, res) {
        const products = await this.productService.getByStore(req.session.id, req.params.storeId);
        sendSuccess(res, 200, products);
    }
    async getAvailableByStore(req, res) {
        const products = await this.productService.getAvailableByStore(req.params.storeId);
        sendSuccess(res, 200, products);
    }
    async getByCategory(req, res) {
        const products = await this.productService.getByCategory(req.params.categoryId);
        sendSuccess(res, 200, products);
    }
    async update(req, res) {
        const product = await this.productService.update(req.session.id, req.params.id, req.body);
        sendSuccess(res, 200, product);
    }
    async setAvailability(req, res) {
        const product = await this.productService.setAvailability(req.session.id, req.params.id, req.body.availability);
        sendSuccess(res, 200, product);
    }
    async archive(req, res) {
        const product = await this.productService.archive(req.session.id, req.params.id);
        sendSuccess(res, 200, product);
    }
    async unarchive(req, res) {
        const product = await this.productService.unarchive(req.session.id, req.params.id);
        sendSuccess(res, 200, product);
    }
}
