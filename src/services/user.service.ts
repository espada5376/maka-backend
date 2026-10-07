import {
  UserRepository,
  type User,
  type CreateUserData,
} from "../database/repositories/user.repository.js";

import { PhoneService } from "./phone.service.js";

import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly phoneService: PhoneService = new PhoneService(),
  ) {}

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw createAppError(Errors.USER_NOT_FOUND);
    }

    return user;
  }

  async getByPhone(phone: string): Promise<User> {
    const normalizedPhone = this.phoneService.normalize(phone);

    const user = await this.userRepository.findByPhone(normalizedPhone);

    if (!user) {
      throw createAppError(Errors.USER_NOT_FOUND);
    }

    return user;
  }

  async create(data: CreateUserData): Promise<User> {
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

  async update(
    id: string,
    data: Partial<Pick<User, "name" | "status">>,
  ): Promise<User> {
    await this.getById(id);

    const updateData: Partial<Pick<User, "name" | "status">> = {};

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

  async markPhoneAsVerified(id: string): Promise<User> {
    await this.getById(id);

    const user = await this.userRepository.markPhoneAsVerified(id);

    if (!user) {
      throw createAppError(Errors.USER_NOT_FOUND);
    }

    return user;
  }

  private normalizeName(name: string | null | undefined): string | null {
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

  private validateStatus(status: User["status"]): User["status"] {
    if (status !== "active" && status !== "inactive") {
      throw createAppError(Errors.INVALID_USER_STATUS);
    }

    return status;
  }
}
