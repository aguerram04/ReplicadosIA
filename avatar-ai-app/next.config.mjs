/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["utfs.io", "res.cloudinary.com"],
  },
  experimental: {
    // Avoid bundling native Node deps used only on the server (e.g., archiver)
    serverComponentsExternalPackages: ["archiver"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark archiver external to prevent webpack from trying to bundle it
      config.externals = config.externals || [];
      config.externals.push("archiver");
    }
    return config;
  },
};

export default nextConfig;
