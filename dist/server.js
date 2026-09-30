import "dotenv/config";
import app from "./app.js";
import { createNotificationWorkerRunner, } from "./notifications/create-notification-worker-runner.js";
const PORT = process.env.PORT || 5000;
const notificationWorkerRunner = createNotificationWorkerRunner();
notificationWorkerRunner?.start();
const server = app.listen(PORT, () => {
    console.log(`Maka API running on port ${PORT}`);
});
function shutdown(signal) {
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
