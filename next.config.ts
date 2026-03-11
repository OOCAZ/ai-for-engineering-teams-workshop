import type { NextConfig } from 'next';

/**
 * Security headers applied to all responses.
 *
 * CSP restricts resource loading to the application origin, Next.js
 * internals (_next), and the local API. Inline styles are permitted via
 * 'unsafe-inline' because Tailwind CSS v4 injects them at build time.
 * Adjust trusted origins before deploying to a CDN.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js injects inline scripts for hydration; nonce-based CSP is the
      // production recommendation but requires middleware — unsafe-inline is
      // acceptable for this workshop project.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind v4 generates inline styles
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs (used by SVG icons and blob download anchors)
      "img-src 'self' data: blob:",
      // API calls are same-origin only
      "connect-src 'self'",
      // Fonts
      "font-src 'self'",
      // No plugins or object embeds
      "object-src 'none'",
      // Prevent embedding in iframes (belt-and-suspenders with X-Frame-Options)
      "frame-ancestors 'none'",
      // Base URI locked to self to prevent base-tag injection
      "base-uri 'self'",
      // Form submissions restricted to self
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
