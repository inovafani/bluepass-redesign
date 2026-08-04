import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

export async function GET(request: NextRequest) {
  const reelUrl = request.nextUrl.searchParams.get("url");

  if (!reelUrl) {
    return new NextResponse("Missing reel URL", { status: 400 });
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(reelUrl);
  } catch {
    return new NextResponse("Invalid reel URL", { status: 400 });
  }

  if (
    !INSTAGRAM_HOSTS.has(parsedUrl.hostname) ||
    !parsedUrl.pathname.startsWith("/reel/")
  ) {
    return new NextResponse("Unsupported reel URL", { status: 400 });
  }

  const mediaResponse = await fetchInstagramMedia(parsedUrl);

  if (mediaResponse) {
    return mediaResponse;
  }

  const ogImage = await fetchOpenGraphImage(parsedUrl);

  if (!ogImage) {
    return new NextResponse("Thumbnail unavailable", { status: 404 });
  }

  const imageResponse = await fetchImage(ogImage);

  return imageResponse ?? new NextResponse("Thumbnail unavailable", { status: 404 });
}

async function fetchInstagramMedia(reelUrl: URL) {
  const mediaUrl = new URL(reelUrl);
  mediaUrl.pathname = normalizeMediaPath(mediaUrl.pathname);
  mediaUrl.search = "?size=l";

  return fetchImage(mediaUrl);
}

async function fetchOpenGraphImage(reelUrl: URL) {
  try {
    const response = await fetch(reelUrl, {
      headers: {
        accept: "text/html",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    const match =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ??
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

    return match ? decodeHtml(match[1]) : "";
  } catch {
    return "";
  }
}

async function fetchImage(url: URL | string) {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return null;
    }

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "content-type": contentType,
      },
    });
  } catch {
    return null;
  }
}

function normalizeMediaPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const reelIndex = parts.indexOf("reel");
  const shortcode = reelIndex >= 0 ? parts[reelIndex + 1] : "";

  return shortcode ? `/p/${shortcode}/media/` : pathname;
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
