import { afterEach, describe, expect, it, vi } from "vitest";

import { createWhatsAppProvider } from "../../../src/notifications/factories/create-whatsapp-provider.js";
import { GenukaWhatsAppProvider } from "../../../src/notifications/providers/genuka-whatsapp.provider.js";

describe("createWhatsAppProvider", () => {
  const originalApiKey = process.env.GENUKA_WA_API_KEY;

  const originalConnectionId = process.env.GENUKA_WA_CONNECTION_ID;

  const originalBaseUrl = process.env.GENUKA_WA_BASE_URL;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GENUKA_WA_API_KEY;
    } else {
      process.env.GENUKA_WA_API_KEY = originalApiKey;
    }

    if (originalConnectionId === undefined) {
      delete process.env.GENUKA_WA_CONNECTION_ID;
    } else {
      process.env.GENUKA_WA_CONNECTION_ID = originalConnectionId;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.GENUKA_WA_BASE_URL;
    } else {
      process.env.GENUKA_WA_BASE_URL = originalBaseUrl;
    }

    vi.restoreAllMocks();
  });

  it("should return undefined when Genuka is not configured", () => {
    delete process.env.GENUKA_WA_API_KEY;
    delete process.env.GENUKA_WA_CONNECTION_ID;

    const provider = createWhatsAppProvider();

    expect(provider).toBeUndefined();
  });

  it("should return undefined when the API key is empty", () => {
    process.env.GENUKA_WA_API_KEY = "   ";
    process.env.GENUKA_WA_CONNECTION_ID = "connection-test";

    const provider = createWhatsAppProvider();

    expect(provider).toBeUndefined();
  });

  it("should return undefined when the connection ID is empty", () => {
    process.env.GENUKA_WA_API_KEY = "api-key-test";
    process.env.GENUKA_WA_CONNECTION_ID = "   ";

    const provider = createWhatsAppProvider();

    expect(provider).toBeUndefined();
  });

  it("should create a Genuka WhatsApp provider when configured", () => {
    process.env.GENUKA_WA_API_KEY = "api-key-test";

    process.env.GENUKA_WA_CONNECTION_ID = "connection-test";

    process.env.GENUKA_WA_BASE_URL = "https://example.test/api/v1";

    const provider = createWhatsAppProvider();

    expect(provider).toBeInstanceOf(GenukaWhatsAppProvider);
  });

  it("should use the default Genuka base URL when none is configured", () => {
    process.env.GENUKA_WA_API_KEY = "api-key-test";

    process.env.GENUKA_WA_CONNECTION_ID = "connection-test";

    delete process.env.GENUKA_WA_BASE_URL;

    const provider = createWhatsAppProvider();

    expect(provider).toBeInstanceOf(GenukaWhatsAppProvider);
  });
});
