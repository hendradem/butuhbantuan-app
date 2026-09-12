import { resolve } from "path";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  // Pure SPA build. All routes (including dynamic /ticket/:token,
  // /dispatch/:token, /track/:token) are handled by Vue Router client-side,
  // hydrated from a single index.html. Avoids the "nginx SPA-fallback returns
  // HTML for _payload.json" trap that breaks hydration in prerender mode.
  ssr: false,

  modules: ["@nuxtjs/tailwindcss", "@nuxt/eslint", "@pinia/nuxt"],

  css: ["~/assets/css/main.css"],

  components: {
    dirs: [
      { path: "~/components", pathPrefix: false },
      {
        path: resolve(__dirname, "../../packages/ui/components"),
        prefix: "Ui",
        global: true,
      },
    ],
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
      geoapifyApiKey: process.env.NUXT_PUBLIC_GEOAPIFY_API_KEY || "",
      /** UI theme: soft | legacy. See utils/uiTheme.ts for rollback. */
      uiTheme: process.env.NUXT_PUBLIC_UI_THEME || "soft",
      /** Color mode: light | dark. See utils/colorMode.ts. */
      colorMode: process.env.NUXT_PUBLIC_COLOR_MODE || "light",
      /** Map tiles: classic (osm) | voyager. See utils/mapAppearance.ts. */
      mapTiles: process.env.NUXT_PUBLIC_MAP_TILES || "classic",
      /** Markers: pin | classic. */
      mapMarkers: process.env.NUXT_PUBLIC_MAP_MARKERS || "pin",
    },
  },

  app: {
    head: {
      htmlAttrs: {
        "data-ui-theme": process.env.NUXT_PUBLIC_UI_THEME || "soft",
        "data-color-mode": process.env.NUXT_PUBLIC_COLOR_MODE || "light",
      },
      title: "ButuhBantuan",
      meta: [
        { name: "description", content: "an emergency assistant for you" },
        { name: "theme-color", content: "#1A1C2E" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      ],
      link: [
        // Open Runde is bundled (see main.css) so the app still renders in its
        // own type with no network — the case this app exists for.
        { rel: "manifest", href: "/manifest.json" },
        { rel: "apple-touch-icon", href: "/ambulance-logo.jpg" },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  devServer: {
    port: 3000,
  },
});
