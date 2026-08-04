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

  const videoUrl = await findVideoUrl(parsedUrl);

  if (!videoUrl) {
    return new NextResponse("Video unavailable", {
      status: 404,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.redirect(videoUrl, {
    status: 307,
    headers: {
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

async function findVideoUrl(reelUrl: URL) {
  const candidates = [reelUrl, getEmbedUrl(reelUrl)];

  for (const candidate of candidates) {
    const html = await fetchInstagramHtml(candidate);
    const videoUrl = html ? extractVideoUrl(html) : "";

    if (videoUrl) {
      return videoUrl;
    }
  }

  return "";
}

function getEmbedUrl(reelUrl: URL) {
  const embedUrl = new URL(reelUrl);
  embedUrl.pathname = normalizeEmbedPath(embedUrl.pathname);
  embedUrl.search = "";

  return embedUrl;
}

async function fetchInstagramHtml(url: URL) {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      return "";
    }

    return response.text();
  } catch {
    return "";
  }
}

function extractVideoUrl(html: string) {
  const patterns = [
    /<meta\s+property=["']og:video(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:video(?::secure_url)?["']/i,
    /"video_url"\s*:\s*"([^"]+)"/i,
    /"playable_url"\s*:\s*"([^"]+)"/i,
    /"contentUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
    /(https?:\\?\/\\?\/[^"'<>\s]+\.mp4[^"'<>\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1];

    if (value) {
      const decoded = decodeMediaUrl(value);

      if (isHttpUrl(decoded)) {
        return decoded;
      }
    }
  }

  return "";
}

function normalizeEmbedPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const reelIndex = parts.indexOf("reel");
  const shortcode = reelIndex >= 0 ? parts[reelIndex + 1] : "";

  return shortcode ? `/reel/${shortcode}/embed/` : pathname;
}

function decodeMediaUrl(value: string) {
  const htmlDecoded = value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

  return htmlDecoded
    .replaceAll("\\/", "/")
    .replaceAll("\\u0026", "&")
    .replaceAll("\\u003d", "=")
    .replaceAll("\\u0025", "%");
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
