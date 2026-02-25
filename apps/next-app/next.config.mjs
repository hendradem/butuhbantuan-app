import withSerwist from "@serwist/next";

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "bprugm.co.id",
      },
    ],
  },
  reactStrictMode: true,
};

export default withSerwist({
  swSrc: "app/service-worker/app-worker.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== "production",
})(nextConfig);