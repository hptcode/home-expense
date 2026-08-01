/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output = small, fast self-hosted image (used by the Dockerfile).
  // Harmless if you instead let Coolify build with Nixpacks.
  output: 'standalone',
};
export default nextConfig;
