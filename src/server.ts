import "dotenv/config";
import app from "./app.js";

import {
  createOtpDeliveryWorkerRunner,
} from "./notifications/create-otp-delivery-worker-runner.js";

import {
  createNotificationWorkerRunner,
} from "./notifications/create-notification-worker-runner.js";

const PORT = process.env.PORT || 5000;

const notificationWorkerRunner =
  createNotificationWorkerRunner();
const otpDeliveryWorkerRunner =
  createOtpDeliveryWorkerRunner();

otpDeliveryWorkerRunner?.start();
notificationWorkerRunner?.start();

const server = app.listen(PORT, () => {
  console.log(`Maka API running on port ${PORT}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received. Shutting down...`);

  notificationWorkerRunner?.stop();

  server.close(() => {
    console.log("Maka API stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
