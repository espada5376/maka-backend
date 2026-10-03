const DEFAULT_POLL_INTERVAL_MS = 5000;
export class OtpDeliveryWorkerRunner {
    worker;
    pollIntervalMs;
    timer = null;
    running = false;
    stopped = true;
    constructor(worker, options = {}) {
        this.worker = worker;
        const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
        if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 0) {
            throw new Error("pollIntervalMs must be a finite non-negative number.");
        }
        this.pollIntervalMs = pollIntervalMs;
    }
    start() {
        if (!this.stopped) {
            return;
        }
        this.stopped = false;
        void this.run();
    }
    stop() {
        this.stopped = true;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    async run() {
        if (this.stopped || this.running) {
            return;
        }
        this.running = true;
        try {
            await this.worker.processNext();
        }
        catch (error) {
            console.error("OTP delivery worker error:", error);
        }
        finally {
            this.running = false;
            if (!this.stopped) {
                this.timer = setTimeout(() => {
                    this.timer = null;
                    void this.run();
                }, this.pollIntervalMs);
            }
        }
    }
}
