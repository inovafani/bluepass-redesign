export type KaiRegion = "indonesia" | "australia";

const indonesiaPattern = /\b(komodo|raja ampat|labuan bajo|flores|liveaboard|phinisi|indonesia)\b/i;
const australiaPattern =
  /\b(gold coast|australia|queensland|whitsundays?|great barrier reef|ningaloo|whale escape|twilight drift|broadwater)\b/i;

export function detectKaiRegion(message: string): KaiRegion | "ambiguous" {
  const mentionsIndonesia = indonesiaPattern.test(message);
  const mentionsAustralia = australiaPattern.test(message);

  if (mentionsIndonesia && !mentionsAustralia) return "indonesia";
  if (mentionsAustralia && !mentionsIndonesia) return "australia";
  return "ambiguous";
}

export const KAI_REGION_CLARIFYING_QUESTION =
  "Are you looking at trips in Indonesia (Komodo, Raja Ampat) or in Australia (Gold Coast)? I can help with either.";
