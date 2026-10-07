import { DeleteObjectCommand, PutObjectCommand, S3Client, } from "@aws-sdk/client-s3";
export class R2ImageStorage {
    client;
    bucketName;
    publicBaseUrl;
    constructor(config) {
        this.client = new S3Client({
            region: "auto",
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
        this.bucketName = config.bucketName;
        this.publicBaseUrl = config.publicBaseUrl.replace(/\/$/, "");
    }
    async upload(key, data, contentType) {
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: data,
            ContentType: contentType,
        }));
    }
    async delete(key) {
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        }));
    }
    getUrl(key) {
        return `${this.publicBaseUrl}/${key}`;
    }
}
