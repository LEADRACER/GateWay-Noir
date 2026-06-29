import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomBytes } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME = "evidence";
const MAX_WIDTH = 800;
const QUALITY = 80;

/**
 * Upload a processed evidence image to Supabase Storage.
 * Falls back to local filesystem if Supabase isn't configured.
 */
export async function uploadEvidence(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  const filename = `ev-${Date.now()}-${randomBytes(4).toString("hex")}.webp`;

  if (supabaseUrl && supabaseServiceKey) {
    const url = await uploadToSupabase(resized, filename);
    if (url) return url;
  }

  // Fallback: local filesystem
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const uploadDir = join(process.cwd(), "public", "uploads", "evidence");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), resized);
  return `/uploads/evidence/${filename}`;
}

async function uploadToSupabase(
  buffer: Buffer,
  filename: string
): Promise<string | null> {
  const client = createClient(supabaseUrl!, supabaseServiceKey!);

  // Ensure bucket exists
  const { data: buckets } = await client.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    await client.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });
  }

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("Supabase storage upload failed:", error.message);
    return null;
  }

  const { data: publicUrlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename);

  return publicUrlData.publicUrl;
}
