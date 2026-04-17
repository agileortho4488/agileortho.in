/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from the FastAPI backend (file proxy)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  // Proxy /api/* to the existing FastAPI backend so client & SSR calls work seamlessly.
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    if (!backend) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
