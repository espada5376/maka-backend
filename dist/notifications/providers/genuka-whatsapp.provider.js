export class GenukaWhatsAppProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async send(message) {
        let response;
        try {
            response = await fetch(`${this.config.baseUrl}/messages`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    connectionId: this.config.connectionId,
                    to: message.to,
                    template: message.template,
                }),
            });
        }
        catch (error) {
            throw new WhatsAppProviderError(error instanceof Error
                ? error.message
                : "Network error while sending WhatsApp message.", "temporary", "NETWORK_ERROR");
        }
        const responseBody = await this.parseResponse(response);
        if (!response.ok) {
            throw this.createProviderError(response.status, responseBody);
        }
        const providerMessageId = this.extractProviderMessageId(responseBody);
        if (!providerMessageId) {
            throw new WhatsAppProviderError("Genuka response does not contain a message ID.", "temporary", "MISSING_MESSAGE_ID");
        }
        return {
            providerMessageId,
        };
    }
    async parseResponse(response) {
        try {
            return (await response.json());
        }
        catch {
            return {};
        }
    }
    extractProviderMessageId(responseBody) {
        const messageId = responseBody.data?.messageId;
        if (typeof messageId !== "string" || !messageId.trim()) {
            return undefined;
        }
        return messageId;
    }
    createProviderError(status, responseBody) {
        const message = `Genuka WhatsApp request failed with status ${status}.`;
        if (status === 400 || status === 401 || status === 403 || status === 404) {
            return new WhatsAppProviderError(message, "permanent", `HTTP_${status}`);
        }
        if (status === 429 || status >= 500) {
            return new WhatsAppProviderError(message, "temporary", `HTTP_${status}`);
        }
        return new WhatsAppProviderError(message, "permanent", `HTTP_${status}`);
    }
}
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
