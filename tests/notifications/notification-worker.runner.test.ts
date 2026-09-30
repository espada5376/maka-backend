import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationWorkerRunner } from "../../src/notifications/notification-worker.runner.js";
import type { NotificationWorker } from "../../src/notifications/notification.worker.js";

describe("NotificationWorkerRunner", () => {
  let worker: {
    processNext: ReturnType<typeof vi.fn>;
  };

  let runner: NotificationWorkerRunner;

  beforeEach(() => {
    vi.useFakeTimers();

    worker = {
      processNext: vi.fn(),
    };

    worker.processNext.mockResolvedValue(false);

    runner = new NotificationWorkerRunner(
      worker as unknown as NotificationWorker,
      {
        pollIntervalMs: 5000,
      },
    );
  });

  afterEach(() => {
    runner.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should process immediately when started", async () => {
    runner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });
  });

  it("should process again after the poll interval", async () => {
    runner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(worker.processNext).toHaveBeenCalledTimes(2);
  });

  it("should not start multiple loops when start is called twice", async () => {
    runner.start();
    runner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(worker.processNext).toHaveBeenCalledTimes(2);
  });

  it("should stop future processing", async () => {
    runner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    runner.stop();

    await vi.advanceTimersByTimeAsync(5000);

    expect(worker.processNext).toHaveBeenCalledTimes(1);
  });

  it("should not schedule another cycle when stopped during processing", async () => {
    let resolveProcess!: (value: boolean) => void;

    worker.processNext.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveProcess = resolve;
        }),
    );

    runner.start();

    expect(worker.processNext).toHaveBeenCalledTimes(1);

    runner.stop();

    resolveProcess(false);

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(worker.processNext).toHaveBeenCalledTimes(1);
  });

  it("should continue running after a worker error", async () => {
    worker.processNext
      .mockRejectedValueOnce(new Error("Worker failure"))
      .mockResolvedValue(false);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    runner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Notification worker error:",
      expect.any(Error),
    );

    await vi.advanceTimersByTimeAsync(5000);

    expect(worker.processNext).toHaveBeenCalledTimes(2);
  });

  it("should reject a negative poll interval", () => {
    expect(
      () =>
        new NotificationWorkerRunner(worker as unknown as NotificationWorker, {
          pollIntervalMs: -1,
        }),
    ).toThrow("pollIntervalMs must be a finite non-negative number.");
  });

  it("should reject a non-finite poll interval", () => {
    expect(
      () =>
        new NotificationWorkerRunner(worker as unknown as NotificationWorker, {
          pollIntervalMs: Number.NaN,
        }),
    ).toThrow("pollIntervalMs must be a finite non-negative number.");
  });

  it("should accept a zero poll interval", async () => {
    const zeroIntervalRunner = new NotificationWorkerRunner(
      worker as unknown as NotificationWorker,
      {
        pollIntervalMs: 0,
      },
    );

    zeroIntervalRunner.start();

    await vi.waitFor(() => {
      expect(worker.processNext).toHaveBeenCalledTimes(1);
    });

    zeroIntervalRunner.stop();
  });
});
