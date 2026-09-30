import {
  WhatsAppProviderError,
  type WhatsAppMessage,
  type WhatsAppProvider,
  type WhatsAppSendResult,
} from "./whatsapp.provider.js";

interface GenukaWhatsAppProviderConfig {
  apiKey: string;
  connectionId: string;
  baseUrl?: string;
}

interface GenukaMessageResponse {
  data?: {
    messageId?: string;
  };
  error?: string;
  message?: string;
}

export class GenukaWhatsAppProvider
  implements WhatsAppProvider
{
  private readonly apiKey: string;
  private readonly connectionId: string;
  private readonly baseUrl: string;

  constructor(config: GenukaWhatsAppProviderConfig) {
    this.apiKey = config.apiKey;
    this.connectionId = config.connectionId;
    this.baseUrl =
      config.baseUrl ?? "https://wa.genuka.com/api/v1";

    if (!this.apiKey.trim()) {
      throw new Error(
        "Genuka WhatsApp API key is required.",
      );
    }

    if (!this.connectionId.trim()) {
      throw new Error(
        "Genuka WhatsApp connection ID is required.",
      );
    }
  }

   async send(
    message: WhatsAppMessage,
  ): Promise<WhatsAppSendResult> {
    let response: Response;

    try {
      response = await fetch(
        `${this.baseUrl}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "maka-backend/1.0",
          },
          body: JSON.stringify({
            connectionId: this.connectionId,
            to: message.to,
            text: message.body,
          }),
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown Genuka network error";

      throw new WhatsAppProviderError(
        errorMessage,
        "temporary",
        "GENUKA_NETWORK_ERROR",
      );
    }

    const responseBody =
      await this.parseResponse(response);

    if (!response.ok) {
      throw this.createProviderError(
        response.status,
        responseBody,
      );
    }

    const providerMessageId =
      responseBody.data?.messageId;

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

  private async parseResponse(
    response: Response,
  ): Promise<GenukaMessageResponse> {
    const contentType =
      response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return {};
    }

    try {
      return (await response.json()) as GenukaMessageResponse;
    } catch {
      return {};
    }
  }


private createProviderError(
    status: number,
    body: GenukaMessageResponse,
  ): WhatsAppProviderError {
    const message =
      body.message ??
      body.error ??
      `Genuka API request failed with status ${status}.`;

    if (status === 400 || status === 404) {
      return new WhatsAppProviderError(
        message,
        "permanent",
        body.error ?? `HTTP_${status}`,
      );
    }

    if (status === 401 || status === 403) {
      return new WhatsAppProviderError(
        message,
        "permanent",
        body.error ?? `HTTP_${status}`,
      );
    }

    if (status === 429) {
      return new WhatsAppProviderError(
        message,
        "temporary",
        body.error ?? "RATE_LIMITED",
      );
    }

    if (status >= 500) {
      return new WhatsAppProviderError(
        message,
        "temporary",
        body.error ?? `HTTP_${status}`,
      );
    }

    return new WhatsAppProviderError(
      message,
      "temporary",
      body.error ?? `HTTP_${status}`,
    );
  }
}
