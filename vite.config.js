import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import runtime from './scripts/runtime.mjs'

const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url)))
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]))
const devHeaders = Object.fromEntries(Object.entries(headers).filter(([key]) => key !== 'Content-Security-Policy'))

export default defineConfig({
  plugins: [runtime()],
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
  server: { headers: devHeaders },
  preview: { headers },
  worker: { format: 'es', plugins: () => [runtime()] }
})
