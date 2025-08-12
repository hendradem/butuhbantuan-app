import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Butuhbantuan",
    short_name: "Butuhbantuan",
    description: "An emergency assistant for you",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/ambulance-logo.jpg",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/ambulance-logo.jpg",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
