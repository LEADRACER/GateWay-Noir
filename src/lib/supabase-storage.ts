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

/**
 * Delete an evidence file from wherever it's stored (Supabase or local).
 * Accepts the full URL (Supabase public URL or local path).
 * Silently succeeds if the file doesn't exist.
 */
export async function deleteEvidenceFile(url: string): Promise<void> {
  const filename = extractFilename(url);
  if (!filename) return;

  // Try Supabase first
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const client = createClient(supabaseUrl!, supabaseServiceKey!);
      const { error } = await client.storage.from(BUCKET_NAME).remove([filename]);
      if (error) {
        // File might not exist in Supabase — proceed to local fallback
        console.debug("Supabase delete failed:", error.message);
      } else {
        return; // deleted from Supabase, done
      }
    } catch {
      // network error, try local
    }
  }

  // Fallback: local filesystem
  try {
    const { unlink } = await import("fs/promises");
    const { join } = await import("path");
    const localPath = join(process.cwd(), "public", "uploads", "evidence", filename);
    await unlink(localPath);
  } catch {
    // file already gone or never existed — fine
  }
}

/**
 * Extract filename from a Supabase public URL or local path.
 * E.g. "https://xyz.supabase.co/.../evidence/ev-123.webp" → "ev-123.webp"
 * E.g. "/uploads/evidence/ev-123.webp" → "ev-123.webp"
 * Returns null for non-evidence URLs (e.g. GDrive links).
 */
function extractFilename(url: string): string | null {
  // Only handle our own evidence files
  if (!url.includes("ev-")) return null;

  // URL path: take everything after the last /
  const parts = url.split("/");
  const last = parts[parts.length - 1];
  if (last && last.startsWith("ev-") && last.endsWith(".webp")) {
    return last;
  }
  return null;
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
