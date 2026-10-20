"use client";

import type { RegisterInput } from "@aaarchive/shared/account";
import type {
  AuthUser,
  LoginInput,
  SessionResponse,
} from "@aaarchive/shared/auth";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import * as accountApi from "@/lib/account/account-api";
import { hasAccountHint } from "@/lib/account/account-hint";
import { accountKeys } from "@/lib/account/account-keys";
import {
  getTokenGeneration,
  refreshSession,
  setAccessToken,
  setRefreshHandler,
} from "@/lib/api/session";

// Customer session (PRD §5.10; docs/architecture.md §4.10). Mounted only by
// /account/** and /checkout, never by the rest of the shop (JS budget). Same
// lifecycle as the dashboard's AuthProvider, with the customer refresh cookie.

type Status = "loading" | "authenticated" | "guest";

type AccountContextValue = {
  status: Status;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  /** Applies a session returned by another call (e.g. change password). */
  applySession: (session: SessionResponse) => void;
};

const AccountContext = React.createContext<AccountContextValue | null>(null);
const CHANNEL = "aaarchive-account";
/** Refresh this long before the access token expires. */
const REFRESH_EARLY_MS = 60_000;

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<Status>("loading");
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = React.useRef<BroadcastChannel | null>(null);

  const endLocally = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setAccessToken(null);
    setUser(null);
    setStatus("guest");
    queryClient.removeQueries({ queryKey: accountKeys.all });
  }, [queryClient]);

  const applySession = React.useCallback(
    (session: SessionResponse) => {
      setAccessToken(session.accessToken);
      setUser(session.user);
      setStatus("authenticated");
      if (timer.current) clearTimeout(timer.current);
      const delay = Math.max(
        session.expiresIn * 1000 - REFRESH_EARLY_MS,
        10_000,
      );
      timer.current = setTimeout(() => {
        refreshSession(getTokenGeneration()).catch(endLocally);
      }, delay);
    },
    [endLocally],
  );

  const applySessionRef = React.useRef(applySession);
  applySessionRef.current = applySession;

  React.useEffect(() => {
    setRefreshHandler(async () => {
      try {
        const session = await accountApi.refresh();
        applySessionRef.current(session);
        return session.accessToken;
      } catch {
        endLocally();
        return null;
      }
    });

    // Guests (no hint cookie) skip the round-trip that would only fail.
    if (hasAccountHint()) {
      refreshSession(getTokenGeneration())
        .then((token) => {
          if (!token) endLocally();
        })
        .catch(endLocally);
    } else {
      endLocally();
    }

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
      // Leaving the account pages: the token must not ride along on other
      // pages' requests (nor reach the dashboard in this tab).
      setAccessToken(null);
    };
  }, [endLocally]);

  const value = React.useMemo<AccountContextValue>(
    () => ({
      status,
      user,
      applySession,
      login: async (input) => {
        applySession(await accountApi.login(input));
      },
      register: async (input) => {
        applySession(await accountApi.register(input));
      },
      logout: async () => {
        await accountApi.logout().catch(() => undefined);
        endLocally();
        channel.current?.postMessage("logout");
      },
      logoutEverywhere: async () => {
        await accountApi.logoutEverywhere();
        endLocally();
        channel.current?.postMessage("logout");
      },
    }),
    [status, user, applySession, endLocally],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const context = React.useContext(AccountContext);
  if (!context)
    throw new Error("useAccount must be used inside <AccountProvider>");
  return context;
}
