/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/radar',
  images: { unoptimized: true }
};

module.exports = nextConfig;
