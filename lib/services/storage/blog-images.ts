import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Article imagery, in the same Supabase project this app already uses — its own bucket, because
 * blog images and operator listing photos have different lifetimes and different people managing
 * them.
 *
 * The bucket provisions itself on first upload (see `createBucket` below), so the only setup a
 * person has to do by hand is put SUPABASE_SERVICE_ROLE_KEY in the environment. That is deliberate:
 * a bucket created by hand in a dashboard is also a bucket somebody forgets to mark public, and the
 * failure mode of that is broken images on a live article rather than a clear error here.
 *
 * Uploading is still not the only way to attach an image — the editor accepts a pasted URL too, so
 * an editorial calendar is never blocked on any of this existing.
 */
const BUCKET = "blog-images";
const MAX_BYTES = 8 * 1024 * 1024;

/* Only formats a browser will actually render inline. SVG is excluded on purpose: it is a script
   host, and these files are served from a URL the public page embeds. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

let cachedClient: ReturnType<typeof createClient> | null = null;
/* Per-process memo: once the bucket is known to exist it cannot stop existing under us, so the
   provisioning round-trip happens at most once per server instance rather than per upload. */
let bucketReady = false;

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Image upload is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the environment " +
        "(Supabase dashboard → Project Settings → API → service_role), or paste an image URL instead.",
    );
  }

  cachedClient ??= createClient(url, serviceRoleKey);
  return cachedClient;
}

/** Supabase reports a missing bucket as a 404 whose message is "Bucket not found". */
function isMissingBucket(error: { message?: string; statusCode?: string } | null) {
  if (!error) return false;
  return /bucket not found/i.test(error.message ?? "") || error.statusCode === "404";
}

/**
 * Creates the bucket if it is not there yet.
 *
 * Public, because every file in it is embedded in a public article — a signed URL would expire and
 * break the page. The size and MIME limits are set here as well as checked in `uploadBlogImage`:
 * this is the copy that still holds if anything ever writes to the bucket without going through
 * this function.
 */
async function ensureBucket(client: ReturnType<typeof createClient>) {
  if (bucketReady) return;

  const { error } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_TYPES,
  });

  // "already exists" is the expected answer on every call after the first, including from another
  // server instance that got there first. Anything else is a real failure worth surfacing.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(
      `Could not create the "${BUCKET}" storage bucket: ${error.message}. ` +
        "Check the service role key, or create the bucket by hand and mark it public.",
    );
  }

  bucketReady = true;
}

/** Runs server-side only — the service role key must never reach the browser. */
export async function uploadBlogImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Images must be JPG, PNG, WebP, AVIF or GIF.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Images must be smaller than 8MB. Compress it first — page speed is a ranking factor.");
  }

  const client = getStorageClient();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  // Year/month prefix so the bucket stays browsable once there are a few hundred articles in it.
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${extension}`;

  const put = () =>
    client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
      // A year — the URL is content-addressed by a UUID, so it can never point at different bytes.
      cacheControl: "31536000",
    });

  let { error } = await put();

  /* Try the upload first and only provision on the failure. The bucket is missing exactly once in
     the life of the project, so paying a getBucket round-trip on every upload to check would be
     the wrong trade. */
  if (isMissingBucket(error)) {
    await ensureBucket(client);
    ({ error } = await put());
  }

  if (error) {
    throw new Error(`Unable to upload the image: ${error.message}`);
  }

  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
