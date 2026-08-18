import { NextResponse, type NextRequest } from "next/server";
import { CONSOLE_PATHNAME_HEADER } from "@/lib/services/pathname";

/**
 * Stamps the requested pathname onto the request headers so a console layout's auth gate can send
 * an unauthenticated visitor back to the exact page they asked for. See
 * `lib/services/pathname.ts` for why the constant lives outside this file.
 *
 * This is *not* the auth check. Middleware sees only the session cookie's existence, never whether
 * it maps to a live session, an admin account or an operator profile, so a gate here would be
 * decorative. The real checks are `requireCurrentAdmin()` and `requireOperatorOrRedirect()`, called
 * in the layouts and re-called inside every server action.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(CONSOLE_PATHNAME_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({ request: { headers } });
}

/* Scoped to the two signed-in consoles only — every other route on the site keeps its current
   zero-middleware request path. `:path*` matches zero segments too, so `/admin` and `/operator`
   themselves are covered. */
export const config = {
  matcher: ["/admin/:path*", "/operator/:path*"],
};
