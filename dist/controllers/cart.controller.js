import { sendSuccess } from "../common/http/response.js";
export class CartController {
    cartService;
    constructor(cartService) {
        this.cartService = cartService;
    }
    async getCart(req, res) {
        const cart = await this.cartService.getCart(req.session.id);
        sendSuccess(res, 200, cart);
    }
    async addItem(req, res) {
        const item = await this.cartService.addItem(req.session.id, req.body.product_id, req.body.quantity);
        sendSuccess(res, 201, item);
    }
    async updateItemQuantity(req, res) {
        const item = await this.cartService.updateItemQuantity(req.session.id, req.params.itemId, req.body.quantity);
        sendSuccess(res, 200, item);
    }
    async removeItem(req, res) {
        await this.cartService.removeItem(req.session.id, req.params.itemId);
        res.status(204).end();
    }
}
