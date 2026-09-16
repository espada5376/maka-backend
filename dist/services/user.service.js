import { UserRepository, } from "../database/repositories/user.repository.js";
export var UserErrorCode;
(function (UserErrorCode) {
    UserErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    UserErrorCode["INVALID_NAME"] = "INVALID_NAME";
    UserErrorCode["INVALID_PHONE"] = "INVALID_PHONE";
    UserErrorCode["PHONE_ALREADY_EXISTS"] = "PHONE_ALREADY_EXISTS";
    UserErrorCode["INVALID_STATUS"] = "INVALID_STATUS";
})(UserErrorCode || (UserErrorCode = {}));
export class UserServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "UserServiceError";
    }
}
export class UserService {
    userRepository;
    constructor(userRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }
    async getById(id) {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new UserServiceError(UserErrorCode.USER_NOT_FOUND, `User not found: ${id}`);
        }
        return user;
    }
    async getByPhone(phone) {
        const normalizedPhone = this.normalizePhone(phone);
        const user = await this.userRepository.findByPhone(normalizedPhone);
        if (!user) {
            throw new UserServiceError(UserErrorCode.USER_NOT_FOUND, `User not found with phone: ${normalizedPhone}`);
        }
        return user;
    }
    async create(data) {
        const phone = this.normalizePhone(data.phone);
        const name = this.normalizeName(data.name);
        const existingUser = await this.userRepository.findByPhone(phone);
        if (existingUser) {
            throw new UserServiceError(UserErrorCode.PHONE_ALREADY_EXISTS, `A user already exists with phone: ${phone}`);
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
        if ("status" in data) {
            updateData.status = this.validateStatus(data.status);
        }
        const updatedUser = await this.userRepository.update(id, updateData);
        if (!updatedUser) {
            throw new UserServiceError(UserErrorCode.USER_NOT_FOUND, `User not found: ${id}`);
        }
        return updatedUser;
    }
    async markPhoneAsVerified(id) {
        await this.getById(id);
        const user = await this.userRepository.markPhoneAsVerified(id);
        if (!user) {
            throw new UserServiceError(UserErrorCode.USER_NOT_FOUND, `User not found: ${id}`);
        }
        return user;
    }
    normalizePhone(phone) {
        if (typeof phone !== "string") {
            throw new UserServiceError(UserErrorCode.INVALID_PHONE, "Phone must be a string");
        }
        const normalizedPhone = phone.trim();
        if (!normalizedPhone || normalizedPhone.length > 20) {
            throw new UserServiceError(UserErrorCode.INVALID_PHONE, "Phone must contain between 1 and 20 characters");
        }
        return normalizedPhone;
    }
    normalizeName(name) {
        if (name === null || name === undefined) {
            return null;
        }
        if (typeof name !== "string") {
            throw new UserServiceError(UserErrorCode.INVALID_NAME, "Name must be a string or null");
        }
        const normalizedName = name.trim();
        if (!normalizedName || normalizedName.length > 100) {
            throw new UserServiceError(UserErrorCode.INVALID_NAME, "Name must contain between 1 and 100 characters");
        }
        return normalizedName;
    }
    validateStatus(status) {
        if (status !== "active" && status !== "inactive") {
            throw new UserServiceError(UserErrorCode.INVALID_STATUS, "Status must be either active or inactive");
        }
        return status;
    }
}
