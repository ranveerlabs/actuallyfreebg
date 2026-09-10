import { mkdir, readFile, writeFile } from 'node:fs/promises'

const base = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'
const dir = new URL('../public/models/', import.meta.url)
await mkdir(dir, { recursive: true })
const response = await fetch(new URL('resources.json', base))
if (!response.ok) throw new Error(`resources: ${response.status}`)
const resources = await response.json()
const selected = Object.fromEntries(Object.entries(resources).filter(([key]) =>
  key === '/models/isnet_fp16' || key === '/onnxruntime-web/ort-wasm-simd-threaded.wasm' || key === '/onnxruntime-web/ort-wasm-simd-threaded.mjs'
))
if (Object.keys(selected).length !== 3) throw new Error('resources missing')
for (const resource of Object.values(selected)) {
  for (const chunk of resource.chunks) {
    const path = new URL(chunk.name, dir)
    try {
      const file = await readFile(path)
      if (file.length === chunk.offsets[1] - chunk.offsets[0]) continue
    } catch {}
    const res = await fetch(new URL(chunk.name, base))
    if (!res.ok) throw new Error(`${chunk.name}: ${res.status}`)
    const data = Buffer.from(await res.arrayBuffer())
    if (data.length !== chunk.offsets[1] - chunk.offsets[0]) throw new Error('incomplete download')
    await writeFile(path, data)
  }
}
await writeFile(new URL('resources.json', dir), JSON.stringify(selected))
console.log('models ready')
