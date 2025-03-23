/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lichess.org'],
  },
  webpack: (config, { isServer }) => {
    // Add WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle the fs module for client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
  // Add support for Web Workers
  experimental: {
    workerThreads: true,
  },
  // Ensure static files are served correctly
  async headers() {
    return [
      {
        source: '/stockfish.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 