import { NextResponse } from "next/server";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { uploadBlogImage } from "@/lib/services/storage/blog-images";

/**
 * Image upload for the blog editor.
 *
 * A route handler rather than a server action because the editor uploads on drop, before the
 * article is saved — it needs a URL back immediately to show the preview, not a form submission.
 *
 * `requireCurrentAdmin()` runs here in its own right. The /admin layout's gate protects what an
 * admin can *see*; it does nothing for an endpoint anyone can POST to directly, and this one
 * writes to a public bucket.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }

  try {
    const url = await uploadBlogImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    // The message is written for the person in the editor (wrong format, too large, storage not
    // configured yet), so it is safe and useful to return verbatim.
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
