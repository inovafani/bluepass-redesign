import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DiscoverPageContent from "@/components/discover/DiscoverPageContent";
import KaiUnlock from "@/components/KaiUnlock";
import { hasPreviewCookie, isPreviewKey, PREVIEW_COOKIE, previewCookieValue } from "@/lib/services/discover/preview-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bluepass trips (preview)",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function unlock(form: FormData) {
  "use server";
  const code = String(form.get("code") ?? "").trim();
  const value = previewCookieValue();
  if (!value || !isPreviewKey(code)) redirect("/preview?wrong=1");
  (await cookies()).set(PREVIEW_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/preview",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/preview");
}

/**
 * The short address of the private trips page: bluepass.co/preview asks for the code once and the
 * browser remembers it for 30 days. The same `DISCOVER_PREVIEW_KEY` as the long /preview/<key> link,
 * which keeps working. With no key configured this is a 404 like any other address that is not there.
 */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ wrong?: string }> }) {
  if (!previewCookieValue()) notFound();

  const jar = await cookies();
  if (hasPreviewCookie(jar.get(PREVIEW_COOKIE)?.value)) {
    return (
      <>
        <KaiUnlock />
        <DiscoverPageContent operatorTripsFirst />
      </>
    );
  }

  const { wrong } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form action={unlock} style={{ display: "grid", gap: 12, width: "min(100%, 360px)" }}>
        <label htmlFor="code" style={{ fontWeight: 600 }}>Preview code</label>
        <input id="code" name="code" type="password" autoComplete="off" autoFocus required style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #bbb", font: "inherit" }} />
        {wrong ? <p role="alert" style={{ margin: 0, color: "#b00020" }}>That code is not right.</p> : null}
        <button type="submit" style={{ padding: "12px 14px", borderRadius: 999, border: 0, background: "#111", color: "#fff", font: "inherit", cursor: "pointer" }}>
          Open
        </button>
      </form>
    </main>
  );
}
