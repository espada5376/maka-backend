import { UserService } from "../services/user.service.js";
export class UserController {
    userService;
    constructor(userService = new UserService()) {
        this.userService = userService;
    }
    async getById(req, res, next) {
        try {
            const user = await this.userService.getById(req.params.id);
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const user = await this.userService.create(req.body);
            res.status(201).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const user = await this.userService.update(req.params.id, req.body);
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async markPhoneAsVerified(req, res, next) {
        try {
            const user = await this.userService.markPhoneAsVerified(req.params.id);
            res.status(200).json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
