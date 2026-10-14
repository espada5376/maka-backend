import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { PhoneService } from "../../src/services/phone.service.js";

import { UserService } from "../../src/services/user.service.js";

describe("UserService", () => {
  const userRepository = {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    markPhoneAsVerified: vi.fn(),
  };


  const phoneService = new PhoneService();

const userService = new UserService(
  userRepository as any,
  phoneService,
);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TEST DATA
  // ---------------------------------------------------------------------------

  const activeUser = {
    id: "user-1",
    phone: "+22890123456",
    phone_verified_at: null,
    name: "Koffi",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------

  describe("getById", () => {
    it("should return the user", async () => {
      userRepository.findById.mockResolvedValue(activeUser);

      const result = await userService.getById("user-1");

      expect(result).toEqual(activeUser);
      expect(userRepository.findById).toHaveBeenCalledWith("user-1");
    });

    it("should reject when the user does not exist", async () => {
      userRepository.findById.mockResolvedValue(undefined);

      await expect(
        userService.getById("unknown"),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");

      userRepository.findById.mockRejectedValue(error);

      await expect(
        userService.getById("user-1"),
      ).rejects.toBe(error);
    });
  });

  // ---------------------------------------------------------------------------
  // GET BY PHONE
  // ---------------------------------------------------------------------------

  describe("getByPhone", () => {
    it("should return the user", async () => {
      userRepository.findByPhone.mockResolvedValue(activeUser);

      const result =
        await userService.getByPhone("+22890123456");

      expect(result).toEqual(activeUser);
      expect(
        userRepository.findByPhone,
      ).toHaveBeenCalledWith("+22890123456");
    });

    it("should reject when the user does not exist", async () => {
      userRepository.findByPhone.mockResolvedValue(undefined);

      await expect(
        userService.getByPhone("+22890000000"),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");

      userRepository.findByPhone.mockRejectedValue(error);

      await expect(
        userService.getByPhone("+22890123456"),
      ).rejects.toBe(error);
    });

    it("should trim the phone before searching", async () => {
      userRepository.findByPhone.mockResolvedValue(activeUser);

      await userService.getByPhone(
        "  +22890123456  ",
      );

      expect(
        userRepository.findByPhone,
      ).toHaveBeenCalledWith("+22890123456");
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a user with a valid phone", async () => {
      userRepository.findByPhone.mockResolvedValue(
        undefined,
      );
      userRepository.create.mockResolvedValue(activeUser);

      const result = await userService.create({
        phone: "+22890123456",
        name: "Koffi",
      });

      expect(result).toEqual(activeUser);

      expect(userRepository.create).toHaveBeenCalledWith({
        phone: "+22890123456",
        name: "Koffi",
      });
    });

    it("should create a user without a name", async () => {
      const userWithoutName = {
        ...activeUser,
        name: null,
      };

      userRepository.findByPhone.mockResolvedValue(
        undefined,
      );
      userRepository.create.mockResolvedValue(
        userWithoutName,
      );

      const result = await userService.create({
        phone: "+22890123456",
      });

      expect(result.name).toBeNull();

      expect(userRepository.create).toHaveBeenCalledWith({
        phone: "+22890123456",
        name: null,
      });
    });

    it("should trim the phone", async () => {
      userRepository.findByPhone.mockResolvedValue(
        undefined,
      );
      userRepository.create.mockResolvedValue(activeUser);

      await userService.create({
        phone: "  +22890123456  ",
        name: "Koffi",
      });

      expect(userRepository.findByPhone).toHaveBeenCalledWith(
        "+22890123456",
      );

      expect(userRepository.create).toHaveBeenCalledWith({
        phone: "+22890123456",
        name: "Koffi",
      });
    });

    it("should trim the name", async () => {
      userRepository.findByPhone.mockResolvedValue(
        undefined,
      );
      userRepository.create.mockResolvedValue(activeUser);

      await userService.create({
        phone: "+22890123456",
        name: "  Koffi  ",
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        phone: "+22890123456",
        name: "Koffi",
      });
    });

    it("should reject an empty phone", async () => {
      await expect(
        userService.create({
          phone: "",
          name: "Koffi",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PHONE",
      });

      expect(
        userRepository.findByPhone,
      ).not.toHaveBeenCalled();

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a phone containing only spaces", async () => {
      await expect(
        userService.create({
          phone: "     ",
          name: "Koffi",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PHONE",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a phone longer than 20 characters", async () => {
      await expect(
        userService.create({
          phone: "1".repeat(21),
          name: "Koffi",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PHONE",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject an empty name", async () => {
      await expect(
        userService.create({
          phone: "+22890123456",
          name: "",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a name containing only spaces", async () => {
      await expect(
        userService.create({
          phone: "+22890123456",
          name: "     ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a name longer than 100 characters", async () => {
      await expect(
        userService.create({
          phone: "+22890123456",
          name: "a".repeat(101),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a duplicate phone", async () => {
      userRepository.findByPhone.mockResolvedValue(
        activeUser,
      );

      await expect(
        userService.create({
          phone: "+22890123456",
          name: "Autre utilisateur",
        }),
      ).rejects.toMatchObject({
        code: "PHONE_ALREADY_EXISTS",
      });

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate phone lookup errors", async () => {
      const error = new Error("Database error");

      userRepository.findByPhone.mockRejectedValue(error);

      await expect(
        userService.create({
          phone: "+22890123456",
          name: "Koffi",
        }),
      ).rejects.toBe(error);

      expect(
        userRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate user creation errors", async () => {
      const error = new Error("Database error");

      userRepository.findByPhone.mockResolvedValue(
        undefined,
      );
      userRepository.create.mockRejectedValue(error);

      await expect(
        userService.create({
          phone: "+22890123456",
          name: "Koffi",
        }),
      ).rejects.toBe(error);
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("should update the user's name", async () => {
      const updatedUser = {
        ...activeUser,
        name: "Kodjo",
      };

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.update.mockResolvedValue(
        updatedUser,
      );

      const result = await userService.update(
        "user-1",
        {
          name: "Kodjo",
        },
      );

      expect(result).toEqual(updatedUser);

      expect(userRepository.update).toHaveBeenCalledWith(
        "user-1",
        {
          name: "Kodjo",
        },
      );
    });

    it("should trim the updated name", async () => {
      const updatedUser = {
        ...activeUser,
        name: "Kodjo",
      };

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.update.mockResolvedValue(
        updatedUser,
      );

      await userService.update("user-1", {
        name: "  Kodjo  ",
      });

      expect(userRepository.update).toHaveBeenCalledWith(
        "user-1",
        {
          name: "Kodjo",
        },
      );
    });

    it("should allow setting the name to null", async () => {
      const updatedUser = {
        ...activeUser,
        name: null,
      };

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.update.mockResolvedValue(
        updatedUser,
      );

      await userService.update("user-1", {
        name: null,
      });

      expect(userRepository.update).toHaveBeenCalledWith(
        "user-1",
        {
          name: null,
        },
      );
    });

    it("should reject an empty updated name", async () => {
      userRepository.findById.mockResolvedValue(activeUser);

      await expect(
        userService.update("user-1", {
          name: "",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.update,
      ).not.toHaveBeenCalled();
    });

    it("should reject an updated name containing only spaces", async () => {
      userRepository.findById.mockResolvedValue(activeUser);

      await expect(
        userService.update("user-1", {
          name: "     ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.update,
      ).not.toHaveBeenCalled();
    });

    it("should reject an updated name longer than 100 characters", async () => {
      userRepository.findById.mockResolvedValue(activeUser);

      await expect(
        userService.update("user-1", {
          name: "a".repeat(101),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_NAME",
      });

      expect(
        userRepository.update,
      ).not.toHaveBeenCalled();
    });

    it("should update the user's status", async () => {
      const updatedUser = {
        ...activeUser,
        status: "inactive" as const,
      };

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.update.mockResolvedValue(
        updatedUser,
      );

      const result = await userService.update(
        "user-1",
        {
          status: "inactive",
        },
      );

      expect(result.status).toBe("inactive");

      expect(userRepository.update).toHaveBeenCalledWith(
        "user-1",
        {
          status: "inactive",
        },
      );
    });

    it("should allow reactivating an inactive user", async () => {
      const inactiveUser = {
        ...activeUser,
        status: "inactive" as const,
      };

      const updatedUser = {
        ...inactiveUser,
        status: "active" as const,
      };

      userRepository.findById.mockResolvedValue(
        inactiveUser,
      );
      userRepository.update.mockResolvedValue(
        updatedUser,
      );

      const result = await userService.update(
        "user-1",
        {
          status: "active",
        },
      );

      expect(result.status).toBe("active");
    });

    it("should reject an invalid status", async () => {
      userRepository.findById.mockResolvedValue(activeUser);

      await expect(
        userService.update("user-1", {
          status: "blocked" as any,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_USER_STATUS",
      });

      expect(
        userRepository.update,
      ).not.toHaveBeenCalled();
    });

    it("should reject when the user does not exist", async () => {
      userRepository.findById.mockResolvedValue(
        undefined,
      );

      await expect(
        userService.update("unknown", {
          name: "Koffi",
        }),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });

      expect(
        userRepository.update,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository update errors", async () => {
      const error = new Error("Database error");

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.update.mockRejectedValue(error);

      await expect(
        userService.update("user-1", {
          name: "Koffi",
        }),
      ).rejects.toBe(error);
    });
  });

  // ---------------------------------------------------------------------------
  // PHONE VERIFICATION
  // ---------------------------------------------------------------------------

  describe("markPhoneAsVerified", () => {
    it("should mark the user's phone as verified", async () => {
      const verifiedUser = {
        ...activeUser,
        phone_verified_at: new Date(),
      };

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.markPhoneAsVerified.mockResolvedValue(
        verifiedUser,
      );

      const result =
        await userService.markPhoneAsVerified(
          "user-1",
        );

      expect(result).toEqual(verifiedUser);

      expect(
        userRepository.markPhoneAsVerified,
      ).toHaveBeenCalledWith("user-1");
    });

    it("should reject when the user does not exist", async () => {
      userRepository.findById.mockResolvedValue(
        undefined,
      );

      await expect(
        userService.markPhoneAsVerified("unknown"),
      ).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });

      expect(
        userRepository.markPhoneAsVerified,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");

      userRepository.findById.mockResolvedValue(activeUser);
      userRepository.markPhoneAsVerified.mockRejectedValue(
        error,
      );

      await expect(
        userService.markPhoneAsVerified("user-1"),
      ).rejects.toBe(error);
    });
  });
});
