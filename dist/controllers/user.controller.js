import { sendSuccess } from "../common/http/response.js";
export class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async getById(req, res) {
        const user = await this.userService.getById(req.params.id);
        sendSuccess(res, 200, user);
    }
    async update(req, res) {
        const user = await this.userService.update(req.params.id, req.body);
        sendSuccess(res, 200, user);
    }
}
