import { resolve } from "path";
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "@nuxt/eslint"],
  components: {
    dirs: [
      { path: "~/components", pathPrefix: false },
      { path: resolve(__dirname, "../../packages/ui/components"), prefix: "Ui", global: true },
    ],
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
      adminApiKey: process.env.NUXT_PUBLIC_ADMIN_API_KEY || "",
    },
  },
  css: ["leaflet/dist/leaflet.css"],
  typescript: { strict: true },

  devServer: {
    port: 3001,
  },


});
