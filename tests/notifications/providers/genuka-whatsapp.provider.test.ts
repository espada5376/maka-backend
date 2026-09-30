import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GenukaWhatsAppProvider,
} from "../../../src/notifications/providers/genuka-whatsapp.provider.js";
import {
  WhatsAppProviderError,
} from "../../../src/notifications/providers/whatsapp.provider.js";

describe("GenukaWhatsAppProvider", () => {
  const config = {
    apiKey: "test-api-key",
    connectionId: "test-connection-id",
    baseUrl: "https://wa.genuka.test/api/v1",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should send a text message successfully", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              messageId: "wamid.123456",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );

    const provider =
      new GenukaWhatsAppProvider(config);

    const result = await provider.send({
      to: "+22890000000",
      body: "Votre commande a été créée.",
    });

    expect(result).toEqual({
      providerMessageId: "wamid.123456",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "https://wa.genuka.test/api/v1/messages",
    );

    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-api-key",
        "Content-Type": "application/json",
        "User-Agent": "maka-backend/1.0",
      },
    });

    expect(JSON.parse(options?.body as string)).toEqual({
      connectionId: "test-connection-id",
      to: "+22890000000",
      text: "Votre commande a été créée.",
    });
  });

  it("should reject an empty API key", () => {
    expect(
      () =>
        new GenukaWhatsAppProvider({
          ...config,
          apiKey: "",
        }),
    ).toThrow(
      "Genuka WhatsApp API key is required.",
    );
  });

  it("should reject an empty connection ID", () => {
    expect(
      () =>
        new GenukaWhatsAppProvider({
          ...config,
          connectionId: "",
        }),
    ).toThrow(
      "Genuka WhatsApp connection ID is required.",
    );
  });

  it("should classify a 400 error as permanent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "INVALID_RECIPIENT",
          message: "Recipient phone number is invalid.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider =
      new GenukaWhatsAppProvider(config);

    await expect(
      provider.send({
        to: "+22890000000",
        body: "Test",
      }),
    ).rejects.toMatchObject({
      type: "permanent",
      code: "INVALID_RECIPIENT",
      message: "Recipient phone number is invalid.",
    });
  });

  it("should classify a 401 error as permanent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "UNAUTHORIZED",
          message: "Invalid API key.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider =
      new GenukaWhatsAppProvider(config);

    await expect(
      provider.send({
        to: "+22890000000",
        body: "Test",
      }),
    ).rejects.toMatchObject({
      type: "permanent",
      code: "UNAUTHORIZED",
      message: "Invalid API key.",
    });
  });

  it("should classify a 429 error as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: "Too many requests.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider =
      new GenukaWhatsAppProvider(config);

    await expect(
      provider.send({
        to: "+22890000000",
        body: "Test",
      }),
    ).rejects.toMatchObject({
      type: "temporary",
      code: "RATE_LIMITED",
      message: "Too many requests.",
    });
  });

  it("should classify a 500 error as temporary", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "INTERNAL_ERROR",
          message: "Internal server error.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider =
      new GenukaWhatsAppProvider(config);

    await expect(
      provider.send({
        to: "+22890000000",
        body: "Test",
      }),
    ).rejects.toMatchObject({
      type: "temporary",
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
    });
  });

  it("should classify a network error as temporary", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Network connection failed"),
  );

  const provider =
    new GenukaWhatsAppProvider(config);

  await expect(
    provider.send({
      to: "+22890000000",
      body: "Test",
    }),
  ).rejects.toMatchObject({
    type: "temporary",
    code: "GENUKA_NETWORK_ERROR",
    message: "Network connection failed",
  });
});

  it("should reject a successful response without a message ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {},
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const provider =
      new GenukaWhatsAppProvider(config);

    await expect(
      provider.send({
        to: "+22890000000",
        body: "Test",
      }),
    ).rejects.toMatchObject({
      type: "temporary",
      code: "GENUKA_INVALID_RESPONSE",
      message:
        "Genuka response does not contain a message ID.",
    });
  });
});
