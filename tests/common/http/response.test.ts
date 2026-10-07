import { describe, expect, it, vi } from "vitest";
import { sendSuccess } from "../../../src/common/http/response.js";

describe("sendSuccess", () => {
  it("sends the standard success envelope", () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    const response = { status } as any;

    sendSuccess(response, 201, { id: "product-1" });

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { id: "product-1" },
    });
  });
});
