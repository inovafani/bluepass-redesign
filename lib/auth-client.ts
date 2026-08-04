"use client";

/**
 * Typed browser-side wrappers over `/api/auth/*`.
 *
 * The routes were ported from bluepass-app unchanged, so these signatures are
 * transcribed from their zod schemas (`lib/services/auth/validation.ts`) and
 * their real response shapes rather than guessed. Every helper resolves to a
 * discriminated result instead of throwing, so form components can render the
 * failure inline without a try/catch around every call.
 */

export type Traveller = {
  accountId: string;
  id: string;
  travellerId: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  creatorProfile: { status: string; handle: string | null } | null;
  operatorProfile: { status: string; companyName: string | null } | null;
};

/** Mirrors `authCredentialsSchema.password.min(8)` — used for client-side hints. */
export const PASSWORD_MIN = 8;

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string; code?: string; email?: string };
type Result<T = object> = Ok<T> | Err;

async function post<T>(path: string, body: unknown): Promise<Result<T>> {
  let res: Response;

  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "Can’t reach Bluepass right now. Check your connection." };
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* An empty or non-JSON body is still a usable signal via res.ok. */
  }

  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
      ...(typeof data.code === "string" ? { code: data.code } : {}),
      ...(typeof data.email === "string" ? { email: data.email } : {}),
    };
  }

  return { ok: true, ...(data as T) };
}

export const login = (email: string, password: string) =>
  post<Record<string, never>>("/api/auth/login", { email, password });

export const register = (input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  next?: string;
}) =>
  post<{
    requiresEmailVerification?: boolean;
    email?: string;
    verificationDelivery?: string;
    /** Only present outside production — lets us finish the flow without a mailbox. */
    developmentVerificationUrl?: string;
  }>("/api/auth/register", input);

export const logout = () => post("/api/auth/logout", {});

export const forgotPassword = (email: string) =>
  post<{ requested?: boolean; developmentResetUrl?: string }>("/api/auth/forgot-password", {
    email,
  });

export const resetPassword = (token: string, password: string) =>
  post("/api/auth/reset-password", { token, password });

export const resendVerification = (email: string) =>
  post("/api/auth/resend-verification", { email });

export async function fetchMe(): Promise<Traveller | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { traveller: Traveller | null };
    return data.traveller ?? null;
  } catch {
    return null;
  }
}

/** Initials for the nav avatar — falls back to the email's first letter. */
export function initialsOf(traveller: Traveller) {
  const source = traveller.name?.trim() || traveller.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
