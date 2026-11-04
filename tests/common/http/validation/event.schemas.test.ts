import { describe, expect, it } from "vitest";

import {
  createEventSchema,
} from "../../../../src/common/http/validation/event.schemas.js";

describe("createEventSchema", () => {
  it("should accept a valid store.viewed event", () => {
    const result = createEventSchema.safeParse({
      name: "store.viewed",
      storeId: "store-id",
      eventKey: "event-key",
    });

    expect(result.success).toBe(true);
  });

  it("should require metadata for store.shared", () => {
    const result = createEventSchema.safeParse({
      name: "store.shared",
      storeId: "store-id",
    });

    expect(result.success).toBe(false);
  });

  it("should reject an invalid share channel", () => {
    const result = createEventSchema.safeParse({
      name: "product.shared",
      storeId: "store-id",
      productId: "product-id",
      metadata: {
        channel: "email",
      },
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid search metadata", () => {
    const result = createEventSchema.safeParse({
      name: "search.performed",
      metadata: {
        query: "chaussures",
        results_count: 12,
      },
    });

    expect(result.success).toBe(true);
  });

  it("should reject a negative search results count", () => {
    const result = createEventSchema.safeParse({
      name: "search.performed",
      metadata: {
        query: "chaussures",
        results_count: -1,
      },
    });

    expect(result.success).toBe(false);
  });

  it("should reject metadata on store.viewed", () => {
    const result = createEventSchema.safeParse({
      name: "store.viewed",
      storeId: "store-id",
      metadata: {
        channel: "whatsapp",
      },
    });

    expect(result.success).toBe(false);
  });

  it("should reject unknown fields", () => {
    const result = createEventSchema.safeParse({
      name: "category.viewed",
      userId: "user-id",
    });

    expect(result.success).toBe(false);
  });

it("should reject an empty search query", () => {
  const result = createEventSchema.safeParse({
    name: "search.performed",
    metadata: {
      query: "   ",
      results_count: 0,
    },
  });

  expect(result.success).toBe(false);
});

it("should reject an empty checkout validation reason", () => {
  const result = createEventSchema.safeParse({
    name: "checkout.validation_failed",
    storeId: "store-id",
    metadata: {
      field: "phone",
      reason: "   ",
    },
  });

  expect(result.success).toBe(false);
});
});
