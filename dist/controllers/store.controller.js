import { StoreService } from "../services/store.service.js";
export class StoreController {
    storeService;
    constructor(storeService = new StoreService()) {
        this.storeService = storeService;
    }
    async create(req, res, next) {
        try {
            const store = await this.storeService.create(req.session.id, req.body);
            res.status(201).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const store = await this.storeService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getByOwnerId(req, res, next) {
        try {
            const store = await this.storeService.getByOwnerId(req.params.ownerId);
            res.status(200).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const store = await this.storeService.update(req.session.id, req.params.id, req.body);
            res.status(200).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async activate(req, res, next) {
        try {
            const store = await this.storeService.activate(req.session.id, req.params.id);
            res.status(200).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deactivate(req, res, next) {
        try {
            const store = await this.storeService.deactivate(req.session.id, req.params.id);
            res.status(200).json({
                success: true,
                data: store,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
