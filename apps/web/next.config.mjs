/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@arutech/shared-types"],
  // helmet() on the NestJS API only covers its own JSON responses — every
  // page a browser actually renders (login, dashboard, everything) is
  // served by this app, so the same baseline headers belong here too.
  // Deliberately not shipping a Content-Security-Policy here: this app's
  // script/style sources (Next.js hydration, socket.io-client's direct
  // WebSocket connection to the API — see AUTHENTICATION.md) need to be
  // enumerated and tested against a real build before a CSP can be added
  // without breaking something; a wrong policy shipped untested is worse
  // than no policy. Track that as a real follow-up, not a silent gap.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
