import path from "path";
import fs from "fs/promises";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const MAX_BYTES = 25 * 1024 * 1024;

function s3Enabled(): boolean {
  return Boolean(process.env.BRANDING_S3_BUCKET?.trim());
}

function s3Bucket(): string {
  return process.env.BRANDING_S3_BUCKET!.trim();
}

function docPrefix(): string {
  const p = (process.env.DOCUMENTS_S3_PREFIX || "documents").replace(/^\/+|\/+$/g, "");
  return p;
}

function objectKey(orgId: string, documentId: string, safeFileName: string): string {
  return `${docPrefix()}/${orgId}/${documentId}/${safeFileName}`;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region =
      process.env.AWS_REGION ||
      process.env.AWS_REGION_SNS ||
      "us-east-2";
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID_SNS;
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY_SNS;
    s3Client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  return s3Client;
}

function getLocalDir(orgId: string, documentId: string): string {
  const root =
    process.env.DOCUMENTS_UPLOAD_DIR ||
    path.join(process.cwd(), "uploads", "documents");
  return path.join(root, orgId, documentId);
}

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base.slice(0, 200) || "file";
}

export function assertFileSizeOk(size: number): void {
  if (size > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / (1024 * 1024)} MB).`);
  }
}

export async function writeDocumentFile(
  orgId: string,
  documentId: string,
  originalFileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storageKey: string; fileName: string; fileSizeBytes: number }> {
  assertFileSizeOk(buffer.length);
  const safeName = sanitizeFileName(originalFileName);

  if (s3Enabled()) {
    const key = objectKey(orgId, documentId, safeName);
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
        ContentDisposition: `attachment; filename="${safeName.replace(/"/g, "")}"`,
      })
    );
    return { storageKey: key, fileName: safeName, fileSizeBytes: buffer.length };
  }

  const dir = getLocalDir(orgId, documentId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  await fs.writeFile(filePath, buffer);
  return {
    storageKey: `local:${orgId}/${documentId}/${safeName}`,
    fileName: safeName,
    fileSizeBytes: buffer.length,
  };
}

async function streamToBuffer(
  body: AsyncIterable<Uint8Array> | undefined
): Promise<Buffer | null> {
  if (!body) return null;
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  return Buffer.concat(chunks);
}

export async function readDocumentFile(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (storageKey.startsWith("local:")) {
    const rest = storageKey.slice("local:".length);
    const filePath = path.join(
      process.env.DOCUMENTS_UPLOAD_DIR || path.join(process.cwd(), "uploads", "documents"),
      rest
    );
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, mimeType: "application/octet-stream" };
    } catch {
      return null;
    }
  }

  if (!s3Enabled()) return null;
  try {
    const out = await getS3Client().send(
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: storageKey,
      })
    );
    const buffer = await streamToBuffer(
      out.Body as AsyncIterable<Uint8Array> | undefined
    );
    if (!buffer) return null;
    return {
      buffer,
      mimeType: out.ContentType || "application/octet-stream",
    };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null) {
      const meta = (e as { $metadata?: { httpStatusCode?: number } }).$metadata;
      if (meta?.httpStatusCode === 404) return null;
      const name = "name" in e ? String((e as Error).name) : "";
      if (name === "NoSuchKey" || name === "NotFound") return null;
    }
    throw e;
  }
}

export async function removeDocumentFile(storageKey: string | null): Promise<void> {
  if (!storageKey) return;
  if (storageKey.startsWith("local:")) {
    const rest = storageKey.slice("local:".length);
    const base = path.join(
      process.env.DOCUMENTS_UPLOAD_DIR || path.join(process.cwd(), "uploads", "documents"),
      rest
    );
    await fs.unlink(base).catch(() => {});
    try {
      const dir = path.dirname(base);
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return;
  }

  if (!s3Enabled()) return;
  await getS3Client()
    .send(
      new DeleteObjectCommand({
        Bucket: s3Bucket(),
        Key: storageKey,
      })
    )
    .catch(() => {});
}
