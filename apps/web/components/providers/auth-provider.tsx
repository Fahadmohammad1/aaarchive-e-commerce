"use client";

import type {
  AuthUser,
  LoginInput,
  SessionResponse,
} from "@aaarchive/shared/auth";
import * as React from "react";
import {
  getTokenGeneration,
  refreshSession,
  setAccessToken,
  setRefreshHandler,
} from "@/lib/api/session";
import * as authApi from "@/lib/auth/auth-api";
import { clearSessionHint, setSessionHint } from "@/lib/auth/session-hint";

// Session lifecycle for the dashboard (docs/architecture.md §4.10):
// restore on load from the refresh cookie, refresh shortly before the access
// token expires, sign out in every tab at once.

type Status = "loading" | "authenticated" | "guest";

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  /** Signs in; returns a two-factor token when a code is needed next. */
  login: (input: LoginInput) => Promise<{ mfaToken: string } | null>;
  loginWithTotp: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  /** Applies a session returned by another call (e.g. change password). */
  applySession: (session: SessionResponse) => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);
const CHANNEL = "aaarchive-auth";
/** Refresh this long before the access token expires. */
const REFRESH_EARLY_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("loading");
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = React.useRef<BroadcastChannel | null>(null);

  const endLocally = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAccessToken(null);
    clearSessionHint();
    setUser(null);
    setStatus("guest");
  }, []);

  const applySession = React.useCallback(
    (session: SessionResponse) => {
      setAccessToken(session.accessToken);
      setSessionHint();
      setUser(session.user);
      setStatus("authenticated");
      if (timer.current) clearTimeout(timer.current);
      const delay = Math.max(
        session.expiresIn * 1000 - REFRESH_EARLY_MS,
        10_000,
      );
      // Goes through the single-flight refresh (handler registered below),
      // so it never races a 401-triggered refresh.
      timer.current = setTimeout(() => {
        refreshSession(getTokenGeneration()).catch(endLocally);
      }, delay);
    },
    [endLocally],
  );

  // Lets the timer above use the latest applySession without re-creating it.
  const applySessionRef = React.useRef(applySession);
  applySessionRef.current = applySession;

  React.useEffect(() => {
    // The API client calls this once on a 401 (single-flight in session.ts).
    setRefreshHandler(async () => {
      try {
        const session = await authApi.refresh();
        applySessionRef.current(session);
        return session.accessToken;
      } catch {
        endLocally();
        return null;
      }
    });

    // Restore the session through the same single-flight as 401 retries, so a
    // double-mounted effect (React dev) or a racing 401 sends one request.
    refreshSession(getTokenGeneration())
      .then((token) => {
        if (!token) endLocally();
      })
      .catch(endLocally);

    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = (event) => {
        if (event.data === "logout") endLocally();
      };
    }
    return () => {
      setRefreshHandler(null);
      channel.current?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [endLocally]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      applySession,
      login: async (input) => {
        const result = await authApi.login(input);
        if ("mfaRequired" in result) return { mfaToken: result.mfaToken };
        applySession(result);
        return null;
      },
      loginWithTotp: async (mfaToken, code) => {
        applySession(await authApi.loginWithTotp({ mfaToken, code }));
      },
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        endLocally();
        channel.current?.postMessage("logout");
      },
      logoutEverywhere: async () => {
        await authApi.logoutEverywhere();
        endLocally();
        channel.current?.postMessage("logout");
      },
    }),
    [status, user, applySession, endLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
