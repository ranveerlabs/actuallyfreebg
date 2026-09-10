import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url)))
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]))
const devHeaders = Object.fromEntries(Object.entries(headers).filter(([key]) => key !== 'Content-Security-Policy'))

export default defineConfig({
  server: { headers: devHeaders },
  preview: { headers },
  worker: { format: 'es' }
})
