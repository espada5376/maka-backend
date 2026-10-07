import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserController } from "../../src/controllers/user.controller.js";

describe("UserController", () => {
  const userService = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    markPhoneAsVerified: vi.fn(),
  };

  const controller = new UserController(userService as any);

  const activeUser = {
    id: "user-1",
    phone: "+22890123456",
    phone_verified_at: null,
    name: "Koffi",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createRequest = (overrides: Record<string, unknown> = {}) =>
    ({
      params: {},
      body: {},
      ...overrides,
    }) as any;

  const createResponse = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res as any;
  };

  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------

  describe("getById", () => {
    it("should get the user by id and return 200", async () => {
      userService.getById.mockResolvedValue(activeUser);

      const req = createRequest({
        params: {
          id: "user-1",
        },
      });

      const res = createResponse();

      await controller.getById(req, res);

      expect(userService.getById).toHaveBeenCalledWith("user-1");

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: activeUser,
      });

      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("should update a user and return 200", async () => {
      const updatedUser = {
        ...activeUser,
        name: "Kodjo",
      };

      userService.update.mockResolvedValue(updatedUser);

      const req = createRequest({
        params: {
          id: "user-1",
        },
        body: {
          name: "Kodjo",
        },
      });

      const res = createResponse();

      await controller.update(req, res);

      expect(userService.update).toHaveBeenCalledWith("user-1", {
        name: "Kodjo",
      });

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });
  });
});
