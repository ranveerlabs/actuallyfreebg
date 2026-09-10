import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/LICENSE', ['LICENSE', 'text/plain; charset=utf-8']]
])

createServer(async (req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname)
  if (!file) { res.writeHead(404); res.end('not found'); return }
  try {
    const body = await readFile(new URL(file[0], import.meta.url))
    res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(500)
    res.end('couldnt read the file')
  }
}).listen(5173, '127.0.0.1', () => console.log('http://127.0.0.1:5173'))
