import type { Config } from "tailwindcss";
import baseConfig from "@butuhbantuan/design-tokens/tailwind";
import { colors } from "@butuhbantuan/design-tokens";
import { resolve } from "path";

/**
 * Citizen app brand accent = emergency red (same as ambulance icon wells).
 * Remaps `primary-*` so UiButton, focus rings, and links match `--bb-accent`.
 */
export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...(baseConfig.theme?.extend ?? {}),
      colors: {
        ...((baseConfig.theme?.extend as { colors?: Record<string, unknown> } | undefined)?.colors ?? {}),
        primary: colors.emergency,
      },
    },
  },
  content: [
    "./components/**/*.{vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.ts",
    "./app.vue",
    resolve(__dirname, "../../packages/ui/components/**/*.vue"),
  ],
} satisfies Config;
