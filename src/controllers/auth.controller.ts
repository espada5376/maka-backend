import type { Request, Response, NextFunction } from "express";

import { OtpService } from "../services/otp.service.js";

export class AuthController {
  constructor(
    private readonly otpService: OtpService,
  ) {}

  async requestOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { phone } = req.body;

      await this.otpService.requestOtp(
        req.session.id,
        phone,
      );

      res.status(200).json({
        success: true,
        data: {
          expiresIn: 300,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { phone, code } = req.body;

      const result = await this.otpService.verifyOtp(
        req.session.id,
        phone,
        code,
      );

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
