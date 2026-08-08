import { resolve } from "path";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

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
      mapboxApiKey: process.env.NUXT_PUBLIC_MAPBOX_API_KEY || "",
      geoapifyApiKey: process.env.NUXT_PUBLIC_GEOAPIFY_API_KEY || "",
    },
  },

  app: {
    head: {
      title: "ButuhBantuan",
      meta: [
        { name: "description", content: "an emergency assistant for you" },
        { name: "theme-color", content: "#0f172a" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      ],
      link: [
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
