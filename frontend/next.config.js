/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix Turbopack workspace detection issues
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

module.exports = nextConfig