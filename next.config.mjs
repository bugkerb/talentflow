/** @type {import('next').NextConfig} */
const projectRoot = new URL(".", import.meta.url).pathname;
const isDevelopment = process.env.NODE_ENV !== "production";
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
  ,{ key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}; connect-src 'self' https://*.supabase.co` }
];
const nextConfig = { reactStrictMode: true, poweredByHeader: false, allowedDevOrigins: ["localhost", "127.0.0.1"], outputFileTracingRoot: projectRoot, serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"], experimental: { serverActions: { bodySizeLimit: "6mb" } }, turbopack: { root: projectRoot }, async headers() { return [{ source: "/(.*)", headers: securityHeaders }]; } };
export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
