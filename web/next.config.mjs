/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  },
  transpilePackages: ['@seferbiz/company'],
  // Required so the dev server accepts requests proxied through nginx at biz.loc.
  allowedDevOrigins: ['biz.loc']
};

export default nextConfig;
