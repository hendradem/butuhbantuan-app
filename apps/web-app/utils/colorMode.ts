/**
 * Web-app light / dark color mode (independent of soft | legacy chrome).
 *
 * The in-app toggle is dropped for now — getColorMode() always resolves to
 * light, including for anyone who had previously switched to dark, so no
 * one is left stuck without a way back. The rest of the module stays in
 * place so the feature is a one-line revert away.
 *
 * Persist:
 *   localStorage.setItem('bb-color-mode-v1', 'dark'); location.reload()
 * Clear:
 *   localStorage.removeItem('bb-color-mode-v1'); location.reload()
 */

export type ColorMode = "light" | "dark";

export const COLOR_MODE_DEFAULT: ColorMode = "light";

const STORAGE_KEY = "bb-color-mode-v1";

function fromEnv(): ColorMode | null {
  try {
    const v = String(useRuntimeConfig().public.colorMode || "").toLowerCase();
    if (v === "light" || v === "dark") return v;
    return null;
  } catch {
    return null;
  }
}

function fromStorage(): ColorMode | null {
  if (!import.meta.client) return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
    return null;
  } catch {
    return null;
  }
}

export function getColorMode(): ColorMode {
  return COLOR_MODE_DEFAULT;
}

export function setColorMode(mode: ColorMode) {
  if (!import.meta.client) return;
  localStorage.setItem(STORAGE_KEY, mode);
  applyColorMode(mode);
}

export function toggleColorMode(): ColorMode {
  const next: ColorMode = getColorMode() === "dark" ? "light" : "dark";
  setColorMode(next);
  return next;
}

/** Apply to <html data-color-mode="..."> + theme-color meta. */
export function applyColorMode(mode: ColorMode = getColorMode()) {
  if (!import.meta.client) return;
  document.documentElement.setAttribute("data-color-mode", mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "dark" ? "#0f1117" : "#1A1C2E");
  }
}
