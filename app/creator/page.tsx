import { redirect } from "next/navigation";

/**
 * The Creator console moved to /partner-portal (see the Creator -> Partner rename, then the
 * /partner -> /partner-portal move to stop it colliding with the public /partners page) - this
 * stub only exists so an old bookmarked/shared /creator link keeps working instead of 404ing.
 */
export default function CreatorRouteRedirect() {
  redirect("/partner-portal");
}
