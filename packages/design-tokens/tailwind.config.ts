import type { Config } from "tailwindcss";
import { colors } from "./src/colors";
import { fontFamily, fontSize } from "./src/fonts";

export default {
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize,
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12)",
      },
    },
  },
} satisfies Partial<Config>;
