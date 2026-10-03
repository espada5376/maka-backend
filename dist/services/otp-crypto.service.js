import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual, } from "node:crypto";
const HASH_ALGORITHM = "sha256";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
function getHashSecret() {
    const secret = process.env.OTP_HASH_SECRET;
    if (!secret) {
        throw new Error("OTP_HASH_SECRET is not configured");
    }
    return Buffer.from(secret, "utf8");
}
function getEncryptionKey() {
    const encodedKey = process.env.OTP_ENCRYPTION_KEY;
    if (!encodedKey) {
        throw new Error("OTP_ENCRYPTION_KEY is not configured");
    }
    const key = Buffer.from(encodedKey, "base64");
    if (key.length !== ENCRYPTION_KEY_LENGTH) {
        throw new Error("OTP_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }
    return key;
}
export class OtpDecryptionError extends Error {
    constructor(message = "Invalid encrypted OTP payload") {
        super(message);
        this.name = "OtpDecryptionError";
    }
}
export class OtpCryptoService {
    hash(code) {
        return createHmac(HASH_ALGORITHM, getHashSecret())
            .update(code, "utf8")
            .digest("hex");
    }
    verify(code, expectedHash) {
        const actualHash = Buffer.from(this.hash(code), "hex");
        const expected = Buffer.from(expectedHash, "hex");
        if (actualHash.length !== expected.length) {
            return false;
        }
        return timingSafeEqual(actualHash, expected);
    }
    encrypt(code) {
        const key = getEncryptionKey();
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(code, "utf8"),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return [
            iv.toString("base64"),
            authTag.toString("base64"),
            encrypted.toString("base64"),
        ].join(".");
    }
    decrypt(payload) {
        const parts = payload.split(".");
        if (parts.length !== 3) {
            throw new OtpDecryptionError();
        }
        const [ivEncoded, authTagEncoded, encryptedEncoded] = parts;
        const iv = Buffer.from(ivEncoded, "base64");
        const authTag = Buffer.from(authTagEncoded, "base64");
        const encrypted = Buffer.from(encryptedEncoded, "base64");
        if (iv.length !== IV_LENGTH ||
            authTag.length !== AUTH_TAG_LENGTH) {
            throw new OtpDecryptionError();
        }
        const key = getEncryptionKey();
        try {
            const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final(),
            ]);
            return decrypted.toString("utf8");
        }
        catch {
            throw new OtpDecryptionError();
        }
    }
}
export const otpCryptoService = new OtpCryptoService();
