import { SPECIALTIES } from "@/lib/services/onboarding/creator-match";

/** What a person types when adding a creator by hand, checked and tidied the way scripts/import-creators.ts does. */
export type NewCreator = {
  name: string; brand: string | null; website: string | null; instagram: string | null; contactEmail: string | null;
  baseState: string | null; baseTown: string | null; specialties: string[]; summary: string | null;
};

const STATES = new Set(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]);
const ALLOWED = new Set<string>(SPECIALTIES);
const clean = (v: unknown) => String(v ?? "").trim() || null;

export function slugify(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "creator";
}

export function websiteOf(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(website: string | null) {
  return website ? new URL(website).hostname.replace(/^www\./, "") : null;
}

export function instagramHandleOf(value: string | null) {
  if (!value) return null;
  const m = value.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return (m ? m[1] : value).replace(/^@/, "").replace(/\/$/, "").trim().toLowerCase() || null;
}

export function parseNewCreator(form: FormData): { ok: true; value: NewCreator } | { ok: false; message: string } {
  const name = clean(form.get("name"));
  if (!name) return { ok: false, message: "Enter the creator's name." };

  const websiteRaw = clean(form.get("website"));
  const website = websiteOf(websiteRaw);
  if (websiteRaw && !website) return { ok: false, message: "That website address does not look right." };

  const instagram = instagramHandleOf(clean(form.get("instagram")));
  if (instagram && !/^[a-z0-9_.]{1,30}$/.test(instagram)) return { ok: false, message: "That Instagram handle does not look right." };

  const contactEmail = clean(form.get("contactEmail"))?.toLowerCase() ?? null;
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { ok: false, message: "That email address does not look right." };

  // Without one of these Bluepass has no way to reach them, and nobody could be invited.
  if (!website && !instagram && !contactEmail) return { ok: false, message: "Add a website, an Instagram handle or an email, so we can reach them." };

  const state = clean(form.get("baseState"))?.toUpperCase() ?? null;
  if (state && !STATES.has(state)) return { ok: false, message: "Choose a state from the list." };

  const specialties = [...new Set(form.getAll("specialties").map((s) => String(s).toLowerCase()).filter((s) => ALLOWED.has(s)))];
  return {
    ok: true,
    value: { name, brand: clean(form.get("brand")), website, instagram, contactEmail, baseState: state, baseTown: clean(form.get("baseTown")), specialties, summary: clean(form.get("summary")) },
  };
}
