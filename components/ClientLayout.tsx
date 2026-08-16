"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { getRawAccessToken, getRefreshToken, tryRefresh } from "@/lib/api";

const PROTECTED_ROUTES = [
  "/messages", "/profile", "/collection", "/wishlist",
  "/settings", "/my-listings",
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loadMe, isLoggedIn } = useStore();

  // ── Initialize auth on mount ──────────────────────────────────────────────
  // Strategy:
  //   1. If raw access token exists → loadMe() directly (token may still be valid)
  //   2. If no access token but refresh token exists → tryRefresh() first, then loadMe()
  //   3. If neither → do nothing, let protected route guard handle it
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getRawAccessToken();
      const refreshToken = getRefreshToken();

      if (accessToken) {
        // Token exists in storage — load user directly.
        // apiFetch will handle 401 → auto-refresh internally.
        await loadMe();
      } else if (refreshToken) {
        // No access token but refresh token exists — silently refresh first.
        const refreshed = await tryRefresh();
        if (refreshed) {
          await loadMe();
        }
        // If refresh fails too, onUnauthorized in api.ts will handle state cleanup.
      }
      // No tokens at all → do nothing here, route guard below handles redirect.
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount — not on every pathname change

  // ── Proactive token refresh timer (every 45 minutes) ─────────────────────
  // Runs in background — refreshes before the 1-hour expiry window.
  useEffect(() => {
    const interval = setInterval(async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;

      const expiry = localStorage.getItem("vhq_token_expiry");
      if (!expiry) return;

      const timeLeft = parseInt(expiry, 10) - Date.now();
      // Refresh if less than 10 minutes remaining
      if (timeLeft < 10 * 60 * 1000) {
        await tryRefresh();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // ── Listen for auth events from api.ts ────────────────────────────────────
  useEffect(() => {
    const handleLogout = () => {
      if (!pathname?.includes("/auth")) {
        router.push("/auth?session=expired");
      }
    };

    window.addEventListener("auth-logout", handleLogout);
    return () => window.removeEventListener("auth-logout", handleLogout);
  }, [pathname, router]);

  // ── Protected route guard ─────────────────────────────────────────────────
  // Only redirects after we're sure there's truly no session recoverable.
  // We check both tokens — if either exists, give the initAuth() flow a chance.
  useEffect(() => {
    const isProtected = PROTECTED_ROUTES.some(r => pathname?.startsWith(r));
    if (!isProtected) return;

    const accessToken = getRawAccessToken();
    const refreshToken = getRefreshToken();

    // If no tokens at all → redirect immediately
    if (!accessToken && !refreshToken) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname || "")}`);
    }
    // If tokens exist, initAuth() will validate them — don't redirect preemptively
  }, [pathname, router]);

  return <>{children}</>;
}