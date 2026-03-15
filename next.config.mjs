/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Completely ignore sqlite3 when building for Vercel
      config.externals.push({
        'sqlite3': 'commonjs sqlite3',
      });
    }
    return config;
  },
};

export default nextConfig;
