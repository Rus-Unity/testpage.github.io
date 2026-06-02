import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves from a subpath (https://<user>.github.io/my-3d-app/),
  // so assets must be referenced relative to that base. Change this to match
  // your repo name, or set it to '/' if deploying to a root domain
  // (Netlify, Vercel, Cloudflare Pages, custom domain).
  base: '/my-3d-app/',
})
