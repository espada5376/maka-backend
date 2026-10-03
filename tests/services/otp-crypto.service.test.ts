import { beforeEach, describe, expect, it } from "vitest";

import {
  OtpCryptoService,
  OtpDecryptionError,
} from "../../src/services/otp-crypto.service.js";

describe("OtpCryptoService", () => {
  const service = new OtpCryptoService();

  beforeEach(() => {
    process.env.OTP_HASH_SECRET = "test-otp-hash-secret";
    process.env.OTP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString(
      "base64",
    );
  });

  it("hashes the same code deterministically", () => {
    const first = service.hash("123456");
    const second = service.hash("123456");

    expect(first).toBe(second);
  });

  it("produces different hashes for different codes", () => {
    const first = service.hash("123456");
    const second = service.hash("654321");

    expect(first).not.toBe(second);
  });

  it("verifies a correct code", () => {
    const hash = service.hash("123456");

    expect(service.verify("123456", hash)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const hash = service.hash("123456");

    expect(service.verify("654321", hash)).toBe(false);
  });

  it("encrypts and decrypts an OTP", () => {
    const encrypted = service.encrypt("123456");

    expect(encrypted).not.toBe("123456");
    expect(service.decrypt(encrypted)).toBe("123456");
  });

  it("uses a different ciphertext for each encryption", () => {
    const first = service.encrypt("123456");
    const second = service.encrypt("123456");

    expect(first).not.toBe(second);
  });

  it("rejects a tampered encrypted payload with OtpDecryptionError", () => {
  const encrypted = service.encrypt("123456");
  const parts = encrypted.split(".");

  const encryptedBytes = Buffer.from(parts[2], "base64");
  encryptedBytes[0] ^= 0xff;
  parts[2] = encryptedBytes.toString("base64");

  expect(() => service.decrypt(parts.join("."))).toThrow(
    OtpDecryptionError,
  );
});

  it("rejects a malformed encrypted payload", () => {
    expect(() => service.decrypt("invalid-payload")).toThrow(
      "Invalid encrypted OTP payload",
    );
  });

  it("rejects an invalid encryption key length", () => {
    process.env.OTP_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString(
      "base64",
    );

    expect(() => service.encrypt("123456")).toThrow(
      "OTP_ENCRYPTION_KEY must decode to exactly 32 bytes",
    );
  });

  it("rejects a missing hash secret", () => {
    delete process.env.OTP_HASH_SECRET;

    expect(() => service.hash("123456")).toThrow(
      "OTP_HASH_SECRET is not configured",
    );
  });

  it("rejects a missing encryption key", () => {
    delete process.env.OTP_ENCRYPTION_KEY;

    expect(() => service.encrypt("123456")).toThrow(
      "OTP_ENCRYPTION_KEY is not configured",
    );
  });
});
