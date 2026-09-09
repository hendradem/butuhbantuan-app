/**
 * Web-app UI theme (soft modern vs legacy).
 *
 * ─── Rollback to previous look ───────────────────────────────────────────
 * Option A (browser console):
 *   localStorage.setItem('bb-ui-theme-v1', 'legacy'); location.reload()
 *
 * Option B: set `UI_THEME_DEFAULT` below to `'legacy'`.
 *
 * Option C: env
 *   NUXT_PUBLIC_UI_THEME=legacy
 *
 * Restore soft:
 *   localStorage.setItem('bb-ui-theme-v1', 'soft'); location.reload()
 *   // or localStorage.removeItem('bb-ui-theme-v1')
 * ─────────────────────────────────────────────────────────────────────────
 */

export type UiTheme = "soft" | "legacy";

/** Snapshot before soft redesign (Aug 2026). */
export const UI_THEME_LEGACY: UiTheme = "legacy";

/** Active default after this change. */
export const UI_THEME_DEFAULT: UiTheme = "soft";

const STORAGE_KEY = "bb-ui-theme-v1";

function fromEnv(): UiTheme | null {
  try {
    const v = String(useRuntimeConfig().public.uiTheme || "").toLowerCase();
    if (v === "soft" || v === "legacy") return v;
    return null;
  } catch {
    return null;
  }
}

function fromStorage(): UiTheme | null {
  if (!import.meta.client) return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "soft" || v === "legacy") return v;
    return null;
  } catch {
    return null;
  }
}

export function getUiTheme(): UiTheme {
  return fromStorage() ?? fromEnv() ?? UI_THEME_DEFAULT;
}

export function setUiTheme(theme: UiTheme | null) {
  if (!import.meta.client) return;
  if (theme == null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  applyUiTheme(getUiTheme());
}

/** Apply theme to <html data-ui-theme="..."> */
export function applyUiTheme(theme: UiTheme = getUiTheme()) {
  if (!import.meta.client) return;
  document.documentElement.setAttribute("data-ui-theme", theme);
}
