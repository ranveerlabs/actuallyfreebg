import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const base = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'
const dir = new URL('../public/models/1.7.0-r2/', import.meta.url)
await mkdir(dir, { recursive: true })
const selected = JSON.parse(await readFile(new URL('./resources-1.7.0.json', import.meta.url), 'utf8'))
const valid = (data, chunk) => data.length === chunk.offsets[1] - chunk.offsets[0] && createHash('sha256').update(data).digest('hex') === chunk.hash
for (const [key, resource] of Object.entries(selected)) {
  for (const chunk of resource.chunks) {
    const path = new URL(chunk.name, dir)
    try {
      const file = await readFile(path)
      if (valid(file, chunk)) continue
    } catch {}
    const res = await fetch(new URL(chunk.name, base))
    if (!res.ok) throw new Error(`${chunk.name}: ${res.status}`)
    const data = Buffer.from(await res.arrayBuffer())
    if (!valid(data, chunk)) throw new Error(`invalid asset: ${chunk.name}`)
    await writeFile(path, data)
  }
  if (key.startsWith('/onnxruntime-web/')) {
    await mkdir(new URL('onnxruntime-web/', dir), { recursive: true })
    const chunks = await Promise.all(resource.chunks.map(chunk => readFile(new URL(chunk.name, dir))))
    await writeFile(new URL(key.slice(1), dir), Buffer.concat(chunks))
  }
}
await writeFile(new URL('resources.json', dir), JSON.stringify(selected))
console.log('models ready')
