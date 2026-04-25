/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix Turbopack workspace detection issues
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
