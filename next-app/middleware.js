import { NextResponse } from "next/server";

// Edge middleware: block the non-compliant scrapers that were responsible for
// Vercel edge request overages. Compliant bots are handled via robots.txt.
// Returning 403 early prevents downstream page/data function invocations.
//
// Matcher excludes _next static assets, favicon, and images so CDN-cached assets
// are never billed through this middleware.

const BLOCKED_UA_REGEX = new RegExp(
  [
    // Bytedance — ignores robots
    "Bytespider",
    // SEO scrapers — zero value, heavy load
    "AhrefsBot",
    "SemrushBot",
    "DataForSeoBot",
    "MJ12bot",
    "DotBot",
    "BLEXBot",
    "PetalBot",
    // LLM scrapers that often cloak
    "Diffbot",
    "Omgili",
    "ImagesiftBot",
    "Timpibot",
    "ClaudeBot",
    "anthropic-ai",
    "GPTBot",
    "CCBot",
    "PerplexityBot",
    "Amazonbot",
    "YouBot",
    "AI2Bot",
    "ICC-Crawler",
    "cohere-training-data-crawler",
    // Generic cheap HTTP libraries frequently used for abusive scraping
    "python-requests",
    "Scrapy",
    "HeadlessChrome",
  ].join("|"),
  "i"
);

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";

  if (ua && BLOCKED_UA_REGEX.test(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT static assets, images, favicon, robots, sitemap.
    // This keeps edge-function invocations minimal.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|map)).*)",
  ],
};
