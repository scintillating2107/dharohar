import path from "path";
import { mkdir, readFile, writeFile, access, rm } from "fs/promises";
import { env } from "@/server/env";

/**
 * Object storage for uploaded originals and page images.
 * Keys look like `uploads/{documentId}/original.pdf` or `uploads/{documentId}/page-1.png`.
 * The local driver keeps the same layout the optional Member 2 ML service reads.
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  /** Absolute path on disk, when the driver is local (needed by the external ML service). */
  localPath(key: string): string | null;
}

function localRoot(): string {
  if (env.storageDir) return env.storageDir;
  if (env.isServerless) return path.join("/tmp", "dharohar-storage");
  return path.join(process.cwd(), "data");
}

function safeKey(key: string): string {
  const normalized = path.posix.normalize(key).replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("/../")) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return normalized;
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  localPath(key: string): string {
    return path.join(this.root, ...safeKey(key).split("/"));
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(/* turbopackIgnore: true */ this.localPath(key));
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.localPath(key));
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.localPath(key), { force: true });
  }
}

class S3Storage implements Storage {
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client>;

  constructor(private bucket: string) {
    this.clientPromise = import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: env.s3.region,
          endpoint: env.s3.endpoint,
          forcePathStyle: env.s3.forcePathStyle,
          credentials:
            env.s3.accessKeyId && env.s3.secretAccessKey
              ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
              : undefined,
        })
    );
  }

  localPath(): null {
    return null;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: data, ContentType: contentType })
    );
  }

  async get(key: string): Promise<Buffer | null> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
}

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  if (env.storageDriver === "s3") {
    if (!env.s3.bucket) throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET");
    instance = new S3Storage(env.s3.bucket);
  } else {
    instance = new LocalStorage(localRoot());
  }
  return instance;
}

export const storageKeys = {
  original: (documentId: string, ext: string) => `uploads/${documentId}/original${ext}`,
  page: (documentId: string, page: number) => `uploads/${documentId}/page-${page}.png`,
  enhanced: (documentId: string, page: number) => `uploads/${documentId}/enhanced-${page}.png`,
};
