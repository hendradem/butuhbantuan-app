import type { Config } from "tailwindcss";
import baseConfig from "@butuhbantuan/design-tokens/tailwind";
import { resolve } from "path";

/**
 * Dashboard brand accents = soft red (aligned with emergency / siren).
 * Remaps `primary-*` so sidebar tabs, buttons, and focus rings match
 * the soft-red chrome already used for badges & logo.
 */
const softRed = {
  50: "#fff1f2",
  100: "#ffe4e6",
  200: "#fecdd3",
  300: "#fda4af",
  400: "#fb7185",
  500: "#f43f5e",
  600: "#e11d48",
  700: "#be123c",
  800: "#9f1239",
  900: "#881337",
  950: "#4c0519",
} as const;

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...(baseConfig.theme?.extend ?? {}),
      colors: {
        ...((baseConfig.theme?.extend as { colors?: Record<string, unknown> } | undefined)?.colors ?? {}),
        primary: softRed,
        emergency: softRed,
      },
    },
  },
  content: [
    "./components/**/*.{vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./app.vue",
    "./assets/css/**/*.css",
    resolve(__dirname, "../../packages/ui/components/**/*.vue"),
  ],
} satisfies Config;
