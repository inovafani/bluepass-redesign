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
import { fetchMe, logout as postLogout, type Traveller } from "@/lib/auth-client";

type Ctx = {
  traveller: Traveller | null;
  /** True until the first `/api/auth/me` settles — the nav shows a rest state, not a wrong one. */
  loading: boolean;
  /**
   * Returns what it just fetched as well as storing it. A caller that needs to act on the fresh
   * session immediately — the login page deciding where to land an operator — cannot read it off
   * the context, which is still holding the previous render's value at that point.
   */
  refresh: () => Promise<Traveller | null>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/**
 * Holds the signed-in traveller for the whole app.
 *
 * `/api/auth/me` is called once on mount rather than per-component: the session
 * cookie is httpOnly, so the client has no way to know whether it is signed in
 * without asking the server, and the nav plus every auth page would otherwise
 * each fire their own request.
 */
export default function SessionProvider({ children }: { children: ReactNode }) {
  const [traveller, setTraveller] = useState<Traveller | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchMe();
    setTraveller(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await postLogout();
    setTraveller(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ traveller, loading, refresh, signOut }),
    [traveller, loading, refresh, signOut],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
