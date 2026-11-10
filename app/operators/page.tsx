import { redirect } from "next/navigation";

/**
 * /operators has no page of its own: only individual operators live under it, so the bare path
 * used to 404. Sends people to Explore until there is an index worth building. Temporary on
 * purpose (307), so a future index can take the URL without a cached permanent redirect in the way.
 */
export default function OperatorsIndex() {
  redirect("/explore");
}
