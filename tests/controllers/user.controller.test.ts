import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { UserController } from "../../src/controllers/user.controller.js";

describe("UserController", () => {
  const userService = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    markPhoneAsVerified: vi.fn(),
  };

  const controller = new UserController(
    userService as any,
  );

  const activeUser = {
    id: "user-1",
    phone: "+22890123456",
    phone_verified_at: null,
    name: "Koffi",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createRequest = (
    overrides: Record<string, unknown> = {},
  ) =>
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

      await controller.getById(req, res, next);

      expect(
        userService.getById,
      ).toHaveBeenCalledWith("user-1");

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: activeUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Database error");

      userService.getById.mockRejectedValue(error);

      const req = createRequest({
        params: {
          id: "user-1",
        },
      });

      const res = createResponse();

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a user and return 201", async () => {
      userService.create.mockResolvedValue(activeUser);

      const req = createRequest({
        body: {
          phone: "+22890123456",
          name: "Koffi",
        },
      });

      const res = createResponse();

      await controller.create(req, res, next);

      expect(
        userService.create,
      ).toHaveBeenCalledWith({
        phone: "+22890123456",
        name: "Koffi",
      });

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: activeUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Database error");

      userService.create.mockRejectedValue(error);

      const req = createRequest({
        body: {
          phone: "+22890123456",
          name: "Koffi",
        },
      });

      const res = createResponse();

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
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

      await controller.update(req, res, next);

      expect(
        userService.update,
      ).toHaveBeenCalledWith(
        "user-1",
        {
          name: "Kodjo",
        },
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Database error");

      userService.update.mockRejectedValue(error);

      const req = createRequest({
        params: {
          id: "user-1",
        },
        body: {
          name: "Kodjo",
        },
      });

      const res = createResponse();

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // MARK PHONE AS VERIFIED
  // ---------------------------------------------------------------------------

  describe("markPhoneAsVerified", () => {
    it("should mark the phone as verified and return 200", async () => {
      const verifiedUser = {
        ...activeUser,
        phone_verified_at: new Date(),
      };

      userService.markPhoneAsVerified.mockResolvedValue(
        verifiedUser,
      );

      const req = createRequest({
        params: {
          id: "user-1",
        },
      });

      const res = createResponse();

      await controller.markPhoneAsVerified(
        req,
        res,
        next,
      );

      expect(
        userService.markPhoneAsVerified,
      ).toHaveBeenCalledWith("user-1");

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: verifiedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should forward service errors to next", async () => {
      const error = new Error("Database error");

      userService.markPhoneAsVerified.mockRejectedValue(
        error,
      );

      const req = createRequest({
        params: {
          id: "user-1",
        },
      });

      const res = createResponse();

      await controller.markPhoneAsVerified(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
