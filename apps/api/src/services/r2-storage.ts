import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import type { StorageService } from "./storage";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export class R2Storage implements StorageService {
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    workspaceId?: number,
  ): Promise<{ url: string; key: string }> {
    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const key = `${workspaceId ?? "shared"}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
      }),
    );

    return {
      url: `${PUBLIC_URL}/${key}`,
      key,
    };
  }

  async delete(key: string): Promise<void> {
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
  }
}
