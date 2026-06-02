import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves this project site from a subpath matching the repo
  // name: https://rus-unity.github.io/testpage.github.io/. The base must match
  // the repo name exactly. Set it to '/' if deploying to a root domain
  // (Netlify, Vercel, Cloudflare Pages, custom domain).
  base: '/testpage.github.io/',
})
