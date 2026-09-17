import { redirect } from "next/navigation";

/**
 * The partner dashboard briefly lived at /partner before moving to /partner-portal, specifically to
 * stop it colliding with the public /partners marketing page (one letter apart, easy to mistype in
 * either direction). This stub only exists so that brief window's links keep working instead of
 * 404ing - see the /creator stub for the same pattern one rename earlier.
 */
export default function PartnerRouteRedirect() {
  redirect("/partner-portal");
}
