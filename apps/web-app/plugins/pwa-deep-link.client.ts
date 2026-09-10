/**
 * PWA deep-link bridge.
 *
 * Scenario: user in Chrome browser tab clicks a shared link (e.g. a ticket URL
 * from WhatsApp). The OpenInAppBanner detects the PWA is installed and
 * records the intended URL to localStorage. When the user then launches the
 * PWA from their home-screen icon, Chrome opens it at the manifest's
 * `start_url` ("/"), NOT at the ticket URL — so without this bridge the user
 * would land on a blank home page and lose the link.
 *
 * This plugin runs on every PWA client boot. If:
 *   1. we're inside the installed PWA (standalone display mode),
 *   2. we landed on the home route,
 *   3. a fresh pending deep link exists (recorded within the last 2 minutes),
 * then we navigate the PWA to that URL and clear the pending entry.
 */
export default defineNuxtPlugin(async () => {
  if (typeof window === "undefined") return;

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!standalone) return;

  const route = useRoute();
  if (route.path !== "/") return;

  const PENDING_KEY = "bb-pending-deep-link";
  const MAX_AGE_MS = 2 * 60 * 1000;

  let pending: { url?: string; ts?: number } | null = null;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) pending = JSON.parse(raw) as { url?: string; ts?: number };
    localStorage.removeItem(PENDING_KEY);
  } catch { /* private mode */ }

  if (!pending?.url || !pending.ts) return;
  if (Date.now() - pending.ts > MAX_AGE_MS) return;
  if (pending.url === "/" || !pending.url.startsWith("/")) return;

  // Dispatch pages are field-officer / community-volunteer flows — must not
  // run inside the citizen PWA. See BrowserOnlyGate.
  if (pending.url.startsWith("/dispatch/")) return;

  await navigateTo(pending.url, { replace: true });
});
