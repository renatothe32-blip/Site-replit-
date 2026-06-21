import { defineConfig } from "next";
export default defineConfig({
  experimental: {
    appDir: true
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false
  }
});
