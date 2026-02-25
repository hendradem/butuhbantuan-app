import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants.js";

/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    runtime: "edge",
  },
  images: {
    domains: ["res.cloudinary.com", "bprugm.co.id"],
  },
  reactStrictMode: true,
};

export default async (phase) => {
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const { default: withSerwist } = await import("@serwist/next");

    return withSerwist({
      ...nextConfig,
      swSrc: "app/service-worker/app-worker.ts",
      swDest: "public/sw.js",
      reloadOnOnline: true,
    });
  }

  return nextConfig;
};