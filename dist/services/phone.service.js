import { parsePhoneNumberFromString, } from "libphonenumber-js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
export class PhoneService {
    normalize(phone) {
        if (typeof phone !== "string") {
            throw createAppError(Errors.INVALID_PHONE);
        }
        const normalizedInput = phone.trim();
        if (!normalizedInput) {
            throw createAppError(Errors.INVALID_PHONE);
        }
        const phoneNumber = parsePhoneNumberFromString(normalizedInput);
        if (!phoneNumber || !phoneNumber.isValid()) {
            throw createAppError(Errors.INVALID_PHONE);
        }
        return phoneNumber.number;
    }
}
