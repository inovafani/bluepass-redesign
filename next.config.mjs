/** @type {import('next').NextConfig} */
const nextConfig = {
  /* The investor page is a hand-built static file in public/invest-vip, served outside the app layout. */
  async rewrites() {
    return [{ source: "/invest-vip", destination: "/invest-vip/index.html" }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      /* Trip photos operators upload (see lib/services/storage/listing-images.ts). Public bucket only. */
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
