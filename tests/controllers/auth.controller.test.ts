import { describe, expect, it, vi } from "vitest";
import { AuthController } from "../../src/controllers/auth.controller.js";
import type { OtpService } from "../../src/services/otp.service.js";

describe("AuthController", () => {
  it("requests an OTP using the current session", async () => {
    const requestOtp = vi.fn().mockResolvedValue(undefined);

    const otpService = {
      requestOtp,
    } as unknown as OtpService;

    const controller = new AuthController(otpService);

    const req = {
      session: {
        id: "session-123",
        user_id: null,
      },
      body: {
        phone: "+22890000000",
      },
    } as any;

    const json = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as any;

    const next = vi.fn();

    await controller.requestOtp(req, res, next);

    expect(requestOtp).toHaveBeenCalledOnce();
    expect(requestOtp).toHaveBeenCalledWith(
      "session-123",
      "+22890000000",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        expiresIn: 300,
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("does not use a client-provided sessionId", async () => {
    const requestOtp = vi.fn().mockResolvedValue(undefined);

    const otpService = {
      requestOtp,
    } as unknown as OtpService;

    const controller = new AuthController(otpService);

    const req = {
      session: {
        id: "real-session-id",
        user_id: null,
      },
      body: {
        phone: "+22890000000",
        sessionId: "fake-session-id",
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnValue({
        json: vi.fn(),
      }),
    } as any;

    const next = vi.fn();

    await controller.requestOtp(req, res, next);

    expect(requestOtp).toHaveBeenCalledWith(
      "real-session-id",
      "+22890000000",
    );

    expect(requestOtp).not.toHaveBeenCalledWith(
      "fake-session-id",
      "+22890000000",
    );
  });

  it("passes request OTP errors to next", async () => {
    const error = new Error("OTP request failed");

    const requestOtp = vi.fn().mockRejectedValue(error);

    const otpService = {
      requestOtp,
    } as unknown as OtpService;

    const controller = new AuthController(otpService);

    const req = {
      session: {
        id: "session-123",
        user_id: null,
      },
      body: {
        phone: "+22890000000",
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    await controller.requestOtp(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(error);
  });

  it("verifies an OTP using the current session", async () => {
    const result = {
      user: {
        id: "user-123",
        phone: "+22890000000",
      },
      otp: {
        id: "otp-123",
      },
    };

    const verifyOtp = vi.fn().mockResolvedValue(result);

    const otpService = {
      verifyOtp,
    } as unknown as OtpService;

    const controller = new AuthController(otpService);

    const req = {
      session: {
        id: "session-123",
        user_id: null,
      },
      body: {
        phone: "+22890000000",
        code: "123456",
      },
    } as any;

    const json = vi.fn();
    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as any;

    const next = vi.fn();

    await controller.verifyOtp(req, res, next);

    expect(verifyOtp).toHaveBeenCalledOnce();
    expect(verifyOtp).toHaveBeenCalledWith(
      "session-123",
      "+22890000000",
      "123456",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        user: result.user,
      },
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("passes OTP verification errors to next", async () => {
    const error = new Error("Invalid OTP");

    const verifyOtp = vi.fn().mockRejectedValue(error);

    const otpService = {
      verifyOtp,
    } as unknown as OtpService;

    const controller = new AuthController(otpService);

    const req = {
      session: {
        id: "session-123",
        user_id: null,
      },
      body: {
        phone: "+22890000000",
        code: "123456",
      },
    } as any;

    const res = {} as any;
    const next = vi.fn();

    await controller.verifyOtp(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(error);
  });

it("passes the phone number to the OTP service without changing it", async () => {
  const requestOtp = vi.fn().mockResolvedValue(undefined);

  const otpService = {
    requestOtp,
  } as unknown as OtpService;

  const controller = new AuthController(otpService);

  const req = {
    session: {
      id: "session-123",
      user_id: null,
    },
    body: {
      phone: "+228 90 12 34 56",
    },
  } as any;

  const res = {
    status: vi.fn().mockReturnValue({
      json: vi.fn(),
    }),
  } as any;

  const next = vi.fn();

  await controller.requestOtp(req, res, next);

  expect(requestOtp).toHaveBeenCalledWith(
    "session-123",
    "+228 90 12 34 56",
  );
});

it("passes the verification phone number to the OTP service without changing it", async () => {
  const result = {
    user: {
      id: "user-123",
      phone: "+22890123456",
    },
    otp: {
      id: "otp-123",
    },
  };

  const verifyOtp = vi.fn().mockResolvedValue(result);

  const otpService = {
    verifyOtp,
  } as unknown as OtpService;

  const controller = new AuthController(otpService);

  const req = {
    session: {
      id: "session-123",
      user_id: null,
    },
    body: {
      phone: "+228 90 12 34 56",
      code: "123456",
    },
  } as any;

  const json = vi.fn();

  const res = {
    status: vi.fn().mockReturnValue({ json }),
  } as any;

  const next = vi.fn();

  await controller.verifyOtp(req, res, next);

  expect(verifyOtp).toHaveBeenCalledWith(
    "session-123",
    "+228 90 12 34 56",
    "123456",
  );
});

});
