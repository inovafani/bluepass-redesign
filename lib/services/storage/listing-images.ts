import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const BUCKET = "operator-listings";
const MAX_BYTES = 5 * 1024 * 1024;

let cachedClient: ReturnType<typeof createClient> | null = null;

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Image upload is not configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedClient ??= createClient(url, serviceRoleKey);
  return cachedClient;
}

// Runs server-side only (service role key must never reach the browser). Buckets/credentials
// are external Supabase dashboard setup, not something this code can provision.
export async function uploadListingHeroImage(file: File, accountId: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Hero image must be an image file.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Hero image must be smaller than 5MB.");
  }

  const client = getStorageClient();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${accountId}/${randomUUID()}.${extension}`;

  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Unable to upload hero image: ${error.message}`);
  }

  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
