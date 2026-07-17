import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages subpath: simonpanigrahi.github.io/simon-2-0/
export default defineConfig({
  base: '/simon-2-0/',
  plugins: [react()],
})
