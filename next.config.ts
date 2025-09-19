/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Re-enable strict mode for better development experience
  experimental: {
    turbo: {
      // Turbo configuration if needed
    },
  },
  // Path mapping for cleaner imports
  webpack: (config: import('webpack').Configuration) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': '/src/components',
      '@/types': '/src/types',
      '@/lib': '/src/lib',
      '@/themes': '/src/themes',
    };
    return config;
  },
};

export default nextConfig;

