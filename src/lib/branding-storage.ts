import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export const BRANDING_ICON_SIZES = [32, 180, 192, 512] as const;
export type BrandingIconSize = (typeof BRANDING_ICON_SIZES)[number];

function s3Enabled(): boolean {
  return Boolean(process.env.BRANDING_S3_BUCKET?.trim());
}

function s3Bucket(): string {
  return process.env.BRANDING_S3_BUCKET!.trim();
}

function s3Prefix(): string {
  const p = (process.env.BRANDING_S3_PREFIX || "branding").replace(/^\/+|\/+$/g, "");
  return p;
}

function s3Key(orgId: string, size: BrandingIconSize): string {
  return `${s3Prefix()}/${orgId}/icon-${size}.png`;
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

export function getBrandingDir(orgId: string): string {
  const root =
    process.env.BRANDING_UPLOAD_DIR ||
    path.join(process.cwd(), "uploads", "branding");
  return path.join(root, orgId);
}

export function iconFilePath(orgId: string, size: BrandingIconSize): string {
  return path.join(getBrandingDir(orgId), `icon-${size}.png`);
}

/**
 * Read one icon file (S3 or local). Returns null if missing.
 */
export async function readBrandingIcon(
  orgId: string,
  size: BrandingIconSize
): Promise<Buffer | null> {
  if (s3Enabled()) {
    try {
      const out = await getS3Client().send(
        new GetObjectCommand({
          Bucket: s3Bucket(),
          Key: s3Key(orgId, size),
        })
      );
      return streamToBuffer(
        out.Body as AsyncIterable<Uint8Array> | undefined
      );
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

  try {
    return await fs.readFile(iconFilePath(orgId, size));
  } catch {
    return null;
  }
}

/**
 * Square-crop, preserve alpha, write 32 / 180 / 192 / 512 PNGs (S3 or local disk).
 */
export async function processAndWriteBrandingIcons(
  orgId: string,
  fileBuffer: Buffer
): Promise<void> {
  const meta = await sharp(fileBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 32 || h < 32) {
    throw new Error("Image is too small (min 32×32).");
  }

  let base: Buffer;
  try {
    base = await sharp(fileBuffer)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    throw new Error(
      "Could not read this image. Use PNG, JPEG, or WebP (not HEIC/SVG unless converted)."
    );
  }

  const client = s3Enabled() ? getS3Client() : null;
  const bucket = s3Enabled() ? s3Bucket() : "";

  for (const size of BRANDING_ICON_SIZES) {
    const out = await sharp(base)
      .resize(size, size, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    if (client) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key(orgId, size),
          Body: out,
          ContentType: "image/png",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
    } else {
      const dir = getBrandingDir(orgId);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (e) {
        const hint =
          process.env.BRANDING_UPLOAD_DIR
            ? "Check BRANDING_UPLOAD_DIR permissions."
            : "Set BRANDING_UPLOAD_DIR to a writable directory, or set BRANDING_S3_BUCKET for cloud storage.";
        throw new Error(
          `Cannot save icon (${hint} ${e instanceof Error ? e.message : ""})`.trim()
        );
      }
      await fs.writeFile(iconFilePath(orgId, size), out);
    }
  }
}

export async function removeBrandingIconFiles(orgId: string): Promise<void> {
  if (s3Enabled()) {
    const client = getS3Client();
    const bucket = s3Bucket();
    await Promise.all(
      BRANDING_ICON_SIZES.map((size) =>
        client
          .send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: s3Key(orgId, size),
            })
          )
          .catch(() => {
            /* ignore missing keys */
          })
      )
    );
    return;
  }

  const dir = getBrandingDir(orgId);
  await fs.rm(dir, { recursive: true, force: true });
}
