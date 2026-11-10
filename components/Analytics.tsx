"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Measurement ID supplied by Tony, 2026-11-10. Not a secret: it is visible in every page's source. */
const GA_ID = "G-N139KFL283";

/* Signed-in and staff areas are never measured: they hold personal and operational data, and the
   privacy policy promises analytics runs on public pages only. shortcut: this is checked when the
   component renders, so someone who loads a public page and then navigates into one of these in the
   same visit keeps being counted until their next full page load; move to consent-gated loading
   if a banner is ever added. */
const PRIVATE = ["/admin", "/crm", "/operator/", "/partner-portal", "/account", "/login", "/register", "/reset-password", "/trip/", "/booked"];

export default function Analytics() {
  const pathname = usePathname() ?? "";
  // Production only, so local work (which shares the production database) does not pollute the stats.
  // Off until NEXT_PUBLIC_GA_ENABLED=true is set in Vercel (build-time): Tony has not yet decided on a consent banner.
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_GA_ENABLED !== "true") return null;
  if (PRIVATE.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix))) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
