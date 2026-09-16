export const CategoryErrorCode = {
    CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
    PARENT_CATEGORY_NOT_FOUND: "PARENT_CATEGORY_NOT_FOUND",
    PARENT_CATEGORY_INACTIVE: "PARENT_CATEGORY_INACTIVE",
    INVALID_NAME: "INVALID_NAME",
    INVALID_SLUG: "INVALID_SLUG",
    SLUG_ALREADY_EXISTS: "SLUG_ALREADY_EXISTS",
    INVALID_PARENT: "INVALID_PARENT",
    MAX_DEPTH_REACHED: "MAX_DEPTH_REACHED",
    INVALID_STATUS: "INVALID_STATUS",
};
export class CategoryServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "CategoryServiceError";
    }
}
export class CategoryService {
    categoryRepository;
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async getById(id) {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new CategoryServiceError(CategoryErrorCode.CATEGORY_NOT_FOUND, "Category not found");
        }
        return category;
    }
    async getBySlug(slug) {
        const category = await this.categoryRepository.findBySlug(slug);
        if (!category) {
            throw new CategoryServiceError(CategoryErrorCode.CATEGORY_NOT_FOUND, "Category not found");
        }
        return category;
    }
    async getChildren(parentId) {
        const parent = await this.categoryRepository.findById(parentId);
        if (!parent) {
            throw new CategoryServiceError(CategoryErrorCode.CATEGORY_NOT_FOUND, "Category not found");
        }
        return this.categoryRepository.findChildren(parentId);
    }
    async getRootCategories() {
        return this.categoryRepository.findRootCategories();
    }
    async create(data) {
        this.validateName(data.name);
        this.validateSlug(data.slug);
        const existingCategory = await this.categoryRepository.findBySlug(data.slug);
        if (existingCategory) {
            throw new CategoryServiceError(CategoryErrorCode.SLUG_ALREADY_EXISTS, "Category slug already exists");
        }
        let parentId = null;
        if (data.parent_id) {
            const parent = await this.categoryRepository.findById(data.parent_id);
            if (!parent) {
                throw new CategoryServiceError(CategoryErrorCode.PARENT_CATEGORY_NOT_FOUND, "Parent category not found");
            }
            if (parent.status !== "active") {
                throw new CategoryServiceError(CategoryErrorCode.PARENT_CATEGORY_INACTIVE, "Parent category is inactive");
            }
            if (parent.parent_id !== null) {
                throw new CategoryServiceError(CategoryErrorCode.MAX_DEPTH_REACHED, "Category hierarchy cannot exceed two levels");
            }
            parentId = parent.id;
        }
        return this.categoryRepository.create({
            name: data.name,
            slug: data.slug,
            parent_id: parentId,
        });
    }
    async update(id, data) {
        const category = await this.categoryRepository.findById(id);
        if (!category) {
            throw new CategoryServiceError(CategoryErrorCode.CATEGORY_NOT_FOUND, "Category not found");
        }
        if (data.name !== undefined) {
            this.validateName(data.name);
        }
        if (data.slug !== undefined) {
            this.validateSlug(data.slug);
            const existingCategory = await this.categoryRepository.findBySlug(data.slug);
            if (existingCategory &&
                existingCategory.id !== category.id) {
                throw new CategoryServiceError(CategoryErrorCode.SLUG_ALREADY_EXISTS, "Category slug already exists");
            }
        }
        if (data.status !== undefined) {
            this.validateStatus(data.status);
        }
        if (data.parent_id !== undefined) {
            if (data.parent_id === id) {
                throw new CategoryServiceError(CategoryErrorCode.INVALID_PARENT, "A category cannot be its own parent");
            }
            if (data.parent_id !== null) {
                const parent = await this.categoryRepository.findById(data.parent_id);
                if (!parent) {
                    throw new CategoryServiceError(CategoryErrorCode.PARENT_CATEGORY_NOT_FOUND, "Parent category not found");
                }
                if (parent.status !== "active") {
                    throw new CategoryServiceError(CategoryErrorCode.PARENT_CATEGORY_INACTIVE, "Parent category is inactive");
                }
                if (parent.parent_id !== null) {
                    throw new CategoryServiceError(CategoryErrorCode.MAX_DEPTH_REACHED, "Category hierarchy cannot exceed two levels");
                }
            }
        }
        return this.categoryRepository.update(id, data);
    }
    validateName(name) {
        if (typeof name !== "string" ||
            name.trim().length === 0) {
            throw new CategoryServiceError(CategoryErrorCode.INVALID_NAME, "Category name is required");
        }
    }
    validateSlug(slug) {
        if (typeof slug !== "string" ||
            slug.trim().length === 0) {
            throw new CategoryServiceError(CategoryErrorCode.INVALID_SLUG, "Category slug is required");
        }
    }
    validateStatus(status) {
        if (status !== "active" &&
            status !== "inactive") {
            throw new CategoryServiceError(CategoryErrorCode.INVALID_STATUS, "Invalid category status");
        }
    }
}
