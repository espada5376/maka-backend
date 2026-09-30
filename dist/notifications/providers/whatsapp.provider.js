export class WhatsAppProviderError extends Error {
    type;
    code;
    constructor(message, type, code) {
        super(message);
        this.type = type;
        this.code = code;
        this.name = "WhatsAppProviderError";
    }
}
