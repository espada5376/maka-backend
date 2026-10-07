export class CategoryController {
    categoryService;
    constructor(categoryService) {
        this.categoryService = categoryService;
    }
    async getById(req, res, next) {
        try {
            const category = await this.categoryService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: category,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBySlug(req, res, next) {
        try {
            const category = await this.categoryService.getBySlug(req.params.slug);
            res.status(200).json({
                success: true,
                data: category,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getChildren(req, res, next) {
        try {
            const categories = await this.categoryService.getChildren(req.params.id);
            res.status(200).json({
                success: true,
                data: categories,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRootCategories(_req, res, next) {
        try {
            const categories = await this.categoryService.getRootCategories();
            res.status(200).json({
                success: true,
                data: categories,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const category = await this.categoryService.create(req.body);
            res.status(201).json({
                success: true,
                data: category,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const category = await this.categoryService.update(req.params.id, req.body);
            res.status(200).json({
                success: true,
                data: category,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
