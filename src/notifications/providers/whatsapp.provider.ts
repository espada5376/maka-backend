export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface WhatsAppSendResult {
  providerMessageId: string;
}

export type WhatsAppProviderErrorType =
  | "temporary"
  | "permanent";

export class WhatsAppProviderError extends Error {
  constructor(
    message: string,
    public readonly type: WhatsAppProviderErrorType,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "WhatsAppProviderError";
  }
}

export interface WhatsAppProvider {
  send(
    message: WhatsAppMessage,
  ): Promise<WhatsAppSendResult>;
}
