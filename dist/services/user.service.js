import { UserRepository, } from "../database/repositories/user.repository.js";
import { PhoneService } from "./phone.service.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
export class UserService {
    userRepository;
    phoneService;
    constructor(userRepository = new UserRepository(), phoneService = new PhoneService()) {
        this.userRepository = userRepository;
        this.phoneService = phoneService;
    }
    async getById(id) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return user;
    }
    async getByPhone(phone) {
        const normalizedPhone = this.phoneService.normalize(phone);
        const user = await this.userRepository.findByPhone(normalizedPhone);
        if (!user) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return user;
    }
    async create(data) {
        const phone = this.phoneService.normalize(data.phone);
        const name = this.normalizeName(data.name);
        const existingUser = await this.userRepository.findByPhone(phone);
        if (existingUser) {
            throw createAppError(Errors.PHONE_ALREADY_EXISTS);
        }
        return this.userRepository.create({
            phone,
            name,
        });
    }
    async update(id, data) {
        await this.getById(id);
        const updateData = {};
        if ("name" in data) {
            updateData.name = this.normalizeName(data.name);
        }
        if (data.status !== undefined) {
            updateData.status = this.validateStatus(data.status);
        }
        const updatedUser = await this.userRepository.update(id, updateData);
        if (!updatedUser) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return updatedUser;
    }
    async markPhoneAsVerified(id) {
        await this.getById(id);
        const user = await this.userRepository.markPhoneAsVerified(id);
        if (!user) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return user;
    }
    normalizeName(name) {
        if (name === null || name === undefined) {
            return null;
        }
        if (typeof name !== "string") {
            throw createAppError(Errors.INVALID_NAME);
        }
        const normalizedName = name.trim();
        if (!normalizedName || normalizedName.length > 100) {
            throw createAppError(Errors.INVALID_NAME);
        }
        return normalizedName;
    }
    validateStatus(status) {
        if (status !== "active" && status !== "inactive") {
            throw createAppError(Errors.INVALID_USER_STATUS);
        }
        return status;
    }
}
