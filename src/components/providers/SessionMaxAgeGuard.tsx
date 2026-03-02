"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SESSION_STORAGE_KEY_PREFIX = "sun6bks.session-start.";
const EXPIRED_SESSION_REDIRECT_URL = "/sign-in?reason=session-expired";

export const SessionMaxAgeGuard = () => {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { signOut } = useClerk();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) return;

    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (!key.startsWith(SESSION_STORAGE_KEY_PREFIX)) continue;
      window.localStorage.removeItem(key);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) return;

    const sessionStorageKey = `${SESSION_STORAGE_KEY_PREFIX}${sessionId}`;
    const storedValue = window.localStorage.getItem(sessionStorageKey);
    const parsedStartTime = storedValue ? Number(storedValue) : Number.NaN;
    const hasValidStoredStartTime =
      storedValue !== null &&
      Number.isFinite(parsedStartTime) &&
      parsedStartTime > 0;
    const sessionStartTime = hasValidStoredStartTime
      ? parsedStartTime
      : Date.now();

    if (!hasValidStoredStartTime) {
      window.localStorage.setItem(sessionStorageKey, String(sessionStartTime));
    }

    const remainingTimeMs = sessionStartTime + SESSION_MAX_AGE_MS - Date.now();

    const handleSessionExpired = async () => {
      if (isSigningOutRef.current) return;
      isSigningOutRef.current = true;
      window.localStorage.removeItem(sessionStorageKey);
      await signOut({ redirectUrl: EXPIRED_SESSION_REDIRECT_URL });
    };

    if (remainingTimeMs <= 0) {
      void handleSessionExpired();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSessionExpired();
    }, remainingTimeMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoaded, isSignedIn, sessionId, signOut]);

  return null;
};
