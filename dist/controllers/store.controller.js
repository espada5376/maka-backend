import { sendSuccess } from "../common/http/response.js";
export class StoreController {
    storeService;
    constructor(storeService) {
        this.storeService = storeService;
    }
    async create(req, res) {
        const store = await this.storeService.create(req.session.id, req.body);
        sendSuccess(res, 201, store);
    }
    async getById(req, res) {
        const store = await this.storeService.getById(req.params.id);
        sendSuccess(res, 200, store);
    }
    async getByOwnerId(req, res) {
        const store = await this.storeService.getByOwnerId(req.params.ownerId);
        sendSuccess(res, 200, store);
    }
    async update(req, res) {
        const store = await this.storeService.update(req.session.id, req.params.id, req.body);
        sendSuccess(res, 200, store);
    }
    async activate(req, res) {
        const store = await this.storeService.activate(req.session.id, req.params.id);
        sendSuccess(res, 200, store);
    }
    async deactivate(req, res) {
        const store = await this.storeService.deactivate(req.session.id, req.params.id);
        sendSuccess(res, 200, store);
    }
}
