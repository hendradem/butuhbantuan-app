import type { Config } from "tailwindcss";
import baseConfig from "@butuhbantuan/design-tokens/tailwind";
import { resolve } from "path";
export default { ...baseConfig, content: ["./components/**/*.{vue,ts}", "./layouts/**/*.vue", "./pages/**/*.vue", "./app.vue", resolve(__dirname, "../../packages/ui/components/**/*.vue")] } satisfies Config;
