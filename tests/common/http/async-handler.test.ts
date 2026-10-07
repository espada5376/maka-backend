import { describe, expect, it, vi } from "vitest";
import { asyncHandler } from "../../../src/common/http/async-handler.js";

describe("asyncHandler", () => {
  it("forwards rejected promises to next", async () => {
    const error = new Error("boom");
    const next = vi.fn();

    const handler = asyncHandler(async () => {
      throw error;
    });

    handler({} as any, {} as any, next);

    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });

  it("does not call next when the handler resolves", async () => {
    const next = vi.fn();

    const handler = asyncHandler(async () => {});

    handler({} as any, {} as any, next);

    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });
});
