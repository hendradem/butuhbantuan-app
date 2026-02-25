import withSerwist from "@serwist/next";

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    domains: ["res.cloudinary.com", "bprugm.co.id"],
  },
  reactStrictMode: true,
};

export default withSerwist({
  swSrc: "app/service-worker/app-worker.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);