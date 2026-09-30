import type { NotificationWorker } from "./notification.worker.js";

const DEFAULT_POLL_INTERVAL_MS = 5000;

export interface NotificationWorkerRunnerOptions {
  pollIntervalMs?: number;
}

export class NotificationWorkerRunner {
  private readonly pollIntervalMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private stopped = true;

  constructor(
    private readonly worker: NotificationWorker,
    options: NotificationWorkerRunnerOptions = {},
  ) {
    this.pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;

    void this.run();
  }

  stop(): void {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async run(): Promise<void> {
    if (this.stopped || this.running) {
      return;
    }

    this.running = true;

    try {
      await this.worker.processNext();
    } catch (error) {
      console.error(
        "Notification worker error:",
        error,
      );
    } finally {
      this.running = false;

      if (!this.stopped) {
        this.timer = setTimeout(
          () => {
            this.timer = null;
            void this.run();
          },
          this.pollIntervalMs,
        );
      }
    }
  }
}
