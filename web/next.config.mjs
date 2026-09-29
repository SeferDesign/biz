/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required so the dev server accepts requests proxied through nginx at biz.loc.
  allowedDevOrigins: ['biz.loc']
};

export default nextConfig;
