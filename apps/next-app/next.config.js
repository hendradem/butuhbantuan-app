<<<<<<< HEAD
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     domains: ["res.cloudinary.com", "bprugm.co.id"],
//   },
//   reactStrictMode: false,

// };

// module.exports = nextConfig;



=======
>>>>>>> 6b922f49fc712b0ac112b37d3528c7afe5dd39e0
const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require("next/constants"); 

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
  /** @type {import("next").NextConfig} */
  const nextConfig = {
  images: {
    domains: ["res.cloudinary.com", "bprugm.co.id"],
<<<<<<< HEAD
  },
  reactStrictMode: false,

=======
  }, 
  reactStrictMode: true,
>>>>>>> 6b922f49fc712b0ac112b37d3528c7afe5dd39e0
};

  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = (await import("@serwist/next")).default({
      swSrc: "app/service-worker/app-worker.ts",
      swDest: "public/sw.js",
      reloadOnOnline: true,
    });
    return withSerwist(nextConfig);
  }

  return nextConfig;
};