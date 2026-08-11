"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { scrollToEl } from "@/lib/lenis";
import { ALL_REGIONS, trips as staticTrips, type Category, type Trip } from "@/lib/discover";

export type CategoryFilter = "All" | Category;

type Ctx = {
  /** Selected region name, or ALL_REGIONS. */
  region: string;
  category: CategoryFilter;
  /** Every trip in scope, unfiltered - the curated 6 plus any real synced listings. */
  allTrips: Trip[];
  /** Trips left after both filters. */
  results: Trip[];
  /** The trip whose sheet is open, if any. */
  openTrip: Trip | null;
  /** Shortlist, keyed by slug. Shared so the grid and the sheet agree. */
  saved: Record<string, boolean>;

  setRegion: (r: string) => void;
  setCategory: (c: CategoryFilter) => void;
  /** Select a region and travel to the results — what a region card does. */
  pickRegion: (r: string) => void;
  clearFilters: () => void;
  goToResults: () => void;
  setOpenTrip: (t: Trip | null) => void;
  toggleSaved: (slug: string) => void;
};

const DiscoverCtx = createContext<Ctx | null>(null);

/** Results are the anchor for every filter action, so the id lives here. */
export const RESULTS_ID = "results";

export function useDiscover() {
  const ctx = useContext(DiscoverCtx);
  if (!ctx) throw new Error("useDiscover must be used inside <DiscoverState>");
  return ctx;
}

/** Trips per region, so the rail can show a live count against each card. Uses the static/curated set only. */
export const countForRegion = (region: string, category: CategoryFilter) =>
  staticTrips.filter(
    (t) =>
      (region === ALL_REGIONS || t.region === region) &&
      (category === "All" || t.category === category),
  ).length;

export default function DiscoverState({
  children,
  trips = staticTrips,
}: {
  children: ReactNode;
  /**
   * The full trip set to filter/display. Defaults to the static curated 6 so any
   * caller that doesn't pass this prop keeps behaving exactly as before. The real
   * page passes the curated trips plus real synced OperatorListing rows.
   */
  trips?: Trip[];
}) {
  const [region, setRegionState] = useState(ALL_REGIONS);
  const [category, setCategoryState] = useState<CategoryFilter>("All");
  const [openTrip, setOpenTrip] = useState<Trip | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  /* Nothing is written to the URL until the visitor actually filters, so a
     clean /discover link stays clean. */
  const [touched, setTouched] = useState(false);

  /* ---- read the opening state out of the URL --------------------------- */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("region");
    const c = q.get("category");
    if (r && trips.some((t) => t.region === r)) setRegionState(r);
    if (c && trips.some((t) => t.category === c)) setCategoryState(c as Category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- and keep it there, so a filtered view is shareable -------------- */
  useEffect(() => {
    if (!touched) return;
    const q = new URLSearchParams(window.location.search);
    if (region === ALL_REGIONS) q.delete("region");
    else q.set("region", region);
    if (category === "All") q.delete("category");
    else q.set("category", category);
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [region, category, touched]);

  const results = useMemo(
    () =>
      trips.filter(
        (t) =>
          (region === ALL_REGIONS || t.region === region) &&
          (category === "All" || t.category === category),
      ),
    [trips, region, category],
  );

  const goToResults = useCallback(() => {
    scrollToEl(document.getElementById(RESULTS_ID), -110);
  }, []);

  const setRegion = useCallback((r: string) => {
    setTouched(true);
    setRegionState(r);
  }, []);

  const setCategory = useCallback((c: CategoryFilter) => {
    setTouched(true);
    setCategoryState(c);
  }, []);

  /* Tapping the region you are already on clears it — the card is a toggle,
     which saves hunting for a reset control. */
  const pickRegion = useCallback(
    (r: string) => {
      setTouched(true);
      setRegionState((cur) => (cur === r ? ALL_REGIONS : r));
      goToResults();
    },
    [goToResults],
  );

  const clearFilters = useCallback(() => {
    setTouched(true);
    setRegionState(ALL_REGIONS);
    setCategoryState("All");
  }, []);

  const toggleSaved = useCallback(
    (slug: string) => setSaved((s) => ({ ...s, [slug]: !s[slug] })),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      region,
      category,
      allTrips: trips,
      results,
      openTrip,
      saved,
      setRegion,
      setCategory,
      pickRegion,
      clearFilters,
      goToResults,
      setOpenTrip,
      toggleSaved,
    }),
    [
      region,
      category,
      trips,
      results,
      openTrip,
      saved,
      setRegion,
      setCategory,
      pickRegion,
      clearFilters,
      goToResults,
      toggleSaved,
    ],
  );

  return <DiscoverCtx.Provider value={value}>{children}</DiscoverCtx.Provider>;
}
