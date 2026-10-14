import { sendSuccess } from "../common/http/response.js";
export class CategoryController {
    categoryService;
    constructor(categoryService) {
        this.categoryService = categoryService;
    }
    async getById(req, res) {
        const category = await this.categoryService.getById(req.params.id);
        sendSuccess(res, 200, category);
    }
    async getBySlug(req, res) {
        const category = await this.categoryService.getBySlug(req.params.slug);
        sendSuccess(res, 200, category);
    }
    async getChildren(req, res) {
        const categories = await this.categoryService.getChildren(req.params.id);
        sendSuccess(res, 200, categories);
    }
    async getRootCategories(_req, res) {
        const categories = await this.categoryService.getRootCategories();
        sendSuccess(res, 200, categories);
    }
    async create(req, res) {
        const category = await this.categoryService.create(req.body);
        sendSuccess(res, 201, category);
    }
    async update(req, res) {
        const category = await this.categoryService.update(req.params.id, req.body);
        sendSuccess(res, 200, category);
    }
}
