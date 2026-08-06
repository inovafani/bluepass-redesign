import { redirect } from "next/navigation";

/**
 * Discover moved to the root, so this path only exists to keep older links —
 * bookmarks, anything already shared or indexed — from 404ing.
 *
 * `redirect` (307) rather than `permanentRedirect` (308) for the same reason as
 * before: a permanent redirect is cached hard by browsers, and the shape of this
 * site is still moving.
 */
export default function DiscoverPage() {
  redirect("/");
}
