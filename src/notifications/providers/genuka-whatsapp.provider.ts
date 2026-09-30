import type {
  WhatsAppMessage,
  WhatsAppProvider,
  WhatsAppSendResult,
} from "./whatsapp.provider.js";

import { WhatsAppProviderError } from "./whatsapp.provider.js";

export interface GenukaWhatsAppProviderConfig {
  apiKey: string;
  connectionId: string;
  baseUrl: string;
}

interface GenukaErrorResponse {
  error?: string;
  message?: string;
}

interface GenukaSuccessResponse {
  data?: {
    messageId?: string;
  };
}

type GenukaResponse = GenukaErrorResponse | GenukaSuccessResponse;

export class GenukaWhatsAppProvider implements WhatsAppProvider {
  constructor(private readonly config: GenukaWhatsAppProviderConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error("Genuka WhatsApp API key is required.");
    }

    if (!config.connectionId?.trim()) {
      throw new Error("Genuka WhatsApp connection ID is required.");
    }

    if (!config.baseUrl?.trim()) {
      throw new Error("Genuka WhatsApp base URL is required.");
    }
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    let response: Response;

    try {
      response = await fetch(`${this.config.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "maka-backend/1.0",
        },
        body: JSON.stringify({
          connectionId: this.config.connectionId,
          to: message.to,
          template: message.template,
        }),
      });
    } catch (error) {
      throw new WhatsAppProviderError(
        error instanceof Error ? error.message : "Network connection failed.",
        "temporary",
        "GENUKA_NETWORK_ERROR",
      );
    }

    const responseBody = await this.parseResponse(response);

    if (!response.ok) {
      throw this.createProviderError(response.status, responseBody);
    }

    const providerMessageId = this.extractProviderMessageId(responseBody);

    if (!providerMessageId) {
      throw new WhatsAppProviderError(
        "Genuka response does not contain a message ID.",
        "temporary",
        "GENUKA_INVALID_RESPONSE",
      );
    }

    return {
      providerMessageId,
    };
  }

  private async parseResponse(response: Response): Promise<GenukaResponse> {
    try {
      return (await response.json()) as GenukaResponse;
    } catch {
      return {};
    }
  }

  private extractProviderMessageId(
    responseBody: GenukaResponse,
  ): string | undefined {
    if (!("data" in responseBody) || !responseBody.data) {
      return undefined;
    }

    const messageId = responseBody.data.messageId;

    if (typeof messageId !== "string" || !messageId.trim()) {
      return undefined;
    }

    return messageId;
  }

  private createProviderError(
    status: number,
    responseBody: GenukaResponse,
  ): WhatsAppProviderError {
    const errorCode =
      "error" in responseBody &&
      typeof responseBody.error === "string" &&
      responseBody.error.trim()
        ? responseBody.error
        : `HTTP_${status}`;

    const errorMessage =
      "message" in responseBody &&
      typeof responseBody.message === "string" &&
      responseBody.message.trim()
        ? responseBody.message
        : `Genuka WhatsApp request failed with status ${status}.`;

    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return new WhatsAppProviderError(errorMessage, "permanent", errorCode);
    }

    if (status === 429 || status >= 500) {
      return new WhatsAppProviderError(errorMessage, "temporary", errorCode);
    }

    return new WhatsAppProviderError(errorMessage, "permanent", errorCode);
  }
}
