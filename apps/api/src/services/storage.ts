import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export interface StorageService {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}

// Local filesystem storage for development
// Replace with Vercel Blob / Cloudflare R2 for production
const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

class LocalStorage implements StorageService {
  async upload(
    buffer: Buffer,
    filename: string,
    _mimeType: string,
  ): Promise<{ url: string; key: string }> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const key = `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    const filepath = join(UPLOADS_DIR, key);

    await writeFile(filepath, buffer);

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    return {
      url: `${baseUrl}/uploads/${key}`,
      key,
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(join(UPLOADS_DIR, key));
    } catch {
      // File may already be deleted
    }
  }
}

export const storage: StorageService = new LocalStorage();
