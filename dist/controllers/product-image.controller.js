import { sendSuccess } from "../common/http/response.js";
export class ProductImageController {
    productImageService;
    constructor(productImageService) {
        this.productImageService = productImageService;
    }
    async create(req, res) {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: {
                    code: "IMAGE_REQUIRED",
                    message: "Image file is required",
                },
            });
            return;
        }
        const image = await this.productImageService.create({
            sessionId: req.session.id,
            product_id: req.params.productId,
            data: req.file.buffer,
            contentType: req.file.mimetype,
        });
        sendSuccess(res, 201, image);
    }
    async reorder(req, res) {
        const images = await this.productImageService.reorder(req.params.productId, req.session.id, req.body.imageIds);
        sendSuccess(res, 200, images);
    }
}
