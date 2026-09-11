// safari why
export default function runtime() {
  return {
    name: 'local-runtime',
    enforce: 'pre',
    transform(source, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@imgly/background-removal/dist/index.mjs')) return
      const changes = [
        ['return URL.createObjectURL(await loadAsBlob(url, config));', 'return new URL(url.slice(1), config.publicPath).href;'],
        ['ort2.env.wasm.numThreads = maxNumThreads();', 'ort2.env.wasm.numThreads = config.model === "isnet_quint8" || !crossOriginIsolated || typeof SharedArrayBuffer === "undefined" ? 1 : maxNumThreads();'],
        ['const imageData = imageBitmapToImageData(imageBitmap);', 'const imageData = imageBitmapToImageData(imageBitmap); imageBitmap.close();'],
        ['const responses = chunks.map(async (chunk) => {', 'const responses = []; for (const chunk of chunks) {'],
        ['const response = await fetch(url, config.fetchArgs);\n    const blob = await response.blob();', 'const blob = await fetchAssetBlob(url, config.fetchArgs);'],
        ['return blob;\n  });\n  const allChunkData = await Promise.all(responses);', 'responses.push(blob);\n  }\n  const allChunkData = responses;']
      ]
      for (const [before, after] of changes) {
        if (!source.includes(before)) throw new Error('background-removal runtime changed')
        source = source.replace(before, after)
      }
      return { code: source + `
async function fetchAssetBlob(url, options) {
  if (new URL(url).origin !== self.location.origin) throw new Error('external asset blocked')
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    try {
      const response = await fetch(url, { ...options, credentials: 'omit', signal: controller.signal })
      if (!response.ok) throw new Error('asset: ' + response.status)
      return await response.blob()
    } catch (error) {
      if (attempt === 1) throw error
    } finally { clearTimeout(timer) }
  }
}
`, map: null }
    }
  }
}
