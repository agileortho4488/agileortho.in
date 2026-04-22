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

  // Aggressive CDN caching on public pages to minimize Vercel edge requests.
  // Pages themselves are ISR (revalidate set per-route); these headers instruct
  // the Vercel CDN + browsers to serve cached copies for longer.
  async headers() {
    return [
      {
        // Public images in /public — cache 1 day, allow stale revalidation.
        // (Next.js auto-sets immutable headers on /_next/static, so we skip that.)
        source: "/:path*.(png|jpg|jpeg|webp|svg|gif|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Robots & sitemap — cached 1h at edge, serves bots cheap responses.
        source: "/(robots.txt|sitemap.xml)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
      {
        // Default pages — serve stale while revalidating in background so
        // repeat hits come from CDN, not origin.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
