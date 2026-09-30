import { UserRepository, } from "../database/repositories/user.repository.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
export class UserService {
    userRepository;
    constructor(userRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }
    async getById(id) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return user;
    }
    async getByPhone(phone) {
        const normalizedPhone = this.normalizePhone(phone);
        const user = await this.userRepository.findByPhone(normalizedPhone);
        if (!user) {
            throw createAppError(Errors.USER_NOT_FOUND);
        }
        return user;
    }
    async create(data) {
        const phone = this.normalizePhone(data.phone);
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
    normalizePhone(phone) {
        if (typeof phone !== "string") {
            throw createAppError(Errors.INVALID_PHONE);
        }
        const normalizedPhone = phone.trim();
        if (!normalizedPhone || normalizedPhone.length > 20) {
            throw createAppError(Errors.INVALID_PHONE);
        }
        return normalizedPhone;
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
