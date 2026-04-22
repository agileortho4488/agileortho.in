// Robots policy for agileortho.in
// Goal: allow legitimate search engines, block aggressive AI scrapers & LLM training bots
// that were responsible for hammering Vercel edge requests (2.8M+ in a single cycle).
//
// NOTE: Compliant crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, PerplexityBot,
// Applebot-Extended, anthropic-ai, cohere-ai) DO honor robots.txt. Non-compliant
// scrapers (Bytespider, AhrefsBot, SemrushBot, DataForSeoBot) are additionally blocked
// at the edge in middleware.js.

const BLOCKED_AI_BOTS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  // Google AI training (does NOT affect Googlebot search indexing)
  "Google-Extended",
  // Common Crawl (feeds most LLM datasets)
  "CCBot",
  // Meta AI
  "FacebookBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  // Apple AI training
  "Applebot-Extended",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Bytedance / TikTok (notorious for ignoring robots, still try)
  "Bytespider",
  // Amazon
  "Amazonbot",
  // Cohere
  "cohere-ai",
  "cohere-training-data-crawler",
  // Misc LLM / scraper
  "Diffbot",
  "Omgilibot",
  "Omgili",
  "ImagesiftBot",
  "Timpibot",
  "YouBot",
  "AI2Bot",
  "Kangaroo Bot",
  "PetalBot",
  "DuckAssistBot",
  "ICC-Crawler",
  // SEO scrapers (heavy load, no SEO value to us)
  "AhrefsBot",
  "SemrushBot",
  "DataForSeoBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
];

export default function robots() {
  return {
    rules: [
      // Allow-list: major search engines get full access (these are not in the overload)
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "DuckDuckBot", allow: "/" },
      { userAgent: "Slurp", allow: "/" }, // Yahoo
      { userAgent: "Yandex", allow: "/" },
      { userAgent: "Baiduspider", allow: "/" },

      // Block-list: every offender above is fully disallowed
      ...BLOCKED_AI_BOTS.map((ua) => ({ userAgent: ua, disallow: "/" })),

      // Default fallback: allow everyone else, but keep admin/api out of indexing
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/"],
      },
    ],
    sitemap: "https://www.agileortho.in/sitemap.xml",
    host: "https://www.agileortho.in",
  };
}
