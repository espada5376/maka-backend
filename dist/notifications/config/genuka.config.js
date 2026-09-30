export function getGenukaWhatsAppConfig() {
    const apiKey = process.env.GENUKA_WA_API_KEY;
    const connectionId = process.env.GENUKA_WA_CONNECTION_ID;
    if (!apiKey?.trim() || !connectionId?.trim()) {
        return undefined;
    }
    return {
        apiKey,
        connectionId,
        baseUrl: process.env.GENUKA_WA_BASE_URL ??
            "https://wa.genuka.com/api/v1",
    };
}
