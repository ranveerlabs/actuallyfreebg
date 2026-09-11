export async function prepare(file, compact, signal) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  let canvas
  const check = () => { if (signal.aborted) throw new DOMException('cancelled', 'AbortError') }
  try {
    await new Promise((resolve, reject) => {
      const abort = () => { img.src = ''; reject(new DOMException('cancelled', 'AbortError')) }
      signal.addEventListener('abort', abort, { once: true })
      const finish = callback => {
        signal.removeEventListener('abort', abort)
        img.onload = img.onerror = null
        callback()
      }
      img.onload = () => finish(resolve)
      img.onerror = () => finish(() => reject(new Error('couldnt read this image. try another file')))
      img.src = url
      if (signal.aborted) abort()
    })
    check()
    const scale = compact ? Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight)) : 1
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    if (!compact && width * height > 25000000) throw new Error('try an image under 25 megapixels')
    if (!compact) return { file, preview: file, width, height, raw: false, resized: false }
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('couldnt open the image. try a smaller file')
    ctx.drawImage(img, 0, 0, width, height)
    img.src = ''
    const pixels = ctx.getImageData(0, 0, width, height)
    const raw = new Blob([pixels.data], { type: `image/x-rgba8;width=${width};height=${height}` })
    const preview = scale < 1 ? await new Promise(resolve => canvas.toBlob(resolve, 'image/png')) : file
    check()
    if (!preview) throw new Error('couldnt prepare this image. try another file')
    return { file: raw, preview, width, height, raw: true, resized: scale < 1 }
  } finally {
    img.onload = img.onerror = null
    img.src = ''
    URL.revokeObjectURL(url)
    if (canvas) canvas.width = canvas.height = 1
  }
}

export async function encode(blob, width, height) {
  const pixels = new Uint8ClampedArray(await blob.arrayBuffer())
  if (pixels.length !== width * height * 4) throw new Error('invalid cutout')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  try {
    canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0)
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('couldnt save the cutout. try a smaller image')
    return png
  } finally {
    canvas.width = canvas.height = 1
  }
}
