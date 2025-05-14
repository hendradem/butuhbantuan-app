import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Butuh Bantuan",
    short_name: "Butuhbantuan",
    description: "An Emergency Assistant For Your Needs",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
  };
}
