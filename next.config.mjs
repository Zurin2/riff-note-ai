/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // Security headers. Deliberately permissive on script-src: Next.js emits inline
  // bootstrap scripts and Tailwind ships inline style attributes, so a nonce-based
  // CSP would require middleware plumbing for no gain here (the app has zero HTML
  // sinks). Everything that can be locked down without touching hydration is.
  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let supabaseOrigin = "";
    try {
      supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
    } catch {
      supabaseOrigin = "";
    }

    const isDev = process.env.NODE_ENV === "development";
    const connectSrc = ["'self'", "https://*.supabase.co", "wss://*.supabase.co", supabaseOrigin]
      .filter(Boolean)
      .join(" ");

    const csp = [
      "default-src 'self'",
      // 'unsafe-eval' is dev-only (Turbopack HMR); production has no eval.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // microphone must stay allowed: the composer uses the Web Speech API.
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
