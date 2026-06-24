import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React strict mode to prevent Cesium double-mount issues
  reactStrictMode: false,

  webpack: (config, { isServer }) => {
    // Prevent Cesium from being bundled server-side (it uses browser APIs)
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [...externals, "cesium"];
    }

    // Define CESIUM_BASE_URL so Cesium can find its static assets at /cesium/
    const { DefinePlugin } = require("webpack");
    config.plugins = config.plugins || [];
    config.plugins.push(
      new DefinePlugin({
        CESIUM_BASE_URL: JSON.stringify("/cesium"),
      })
    );

    // Ignore Node-specific modules requested by Cesium in browser bundle
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      url: false,
    };

    return config;
  },
};

export default nextConfig;
