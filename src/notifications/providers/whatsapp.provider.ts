export interface WhatsAppNewOrderSellerTemplate {
  name: "new_order_seller";
  language: "fr";
  variables: string[];
}

export interface WhatsAppVerificationCodeTemplate {
  name: "verification_code";
  language: "fr";
  otp: string;
}

export type WhatsAppTemplate =
  | WhatsAppNewOrderSellerTemplate
  | WhatsAppVerificationCodeTemplate;

export interface WhatsAppMessage {
  to: string;
  template: WhatsAppTemplate;
}

export interface WhatsAppSendResult {
  providerMessageId: string;
}

export type WhatsAppProviderErrorType = "temporary" | "permanent";

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
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}
