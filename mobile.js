import * as ort from 'onnxruntime-web/wasm'

export async function cutout(file, progress) {
  const width = Number(file.type.match(/width=(\d+)/)?.[1])
  const height = Number(file.type.match(/height=(\d+)/)?.[1])
  const pixels = new Uint8Array(await file.arrayBuffer())
  if (!width || !height || pixels.length !== width * height * 4) throw new Error('invalid image')
  const size = 320
  const count = size * size
  const rgb = new Uint8Array(count * 3)
  let max = 1
  for (let y = 0; y < size; y++) {
    const sy = Math.max(0, Math.min(height - 1, (y + .5) * height / size - .5))
    const top = Math.floor(sy)
    const bottom = Math.min(height - 1, top + 1)
    const fy = sy - top
    for (let x = 0; x < size; x++) {
      const sx = Math.max(0, Math.min(width - 1, (x + .5) * width / size - .5))
      const left = Math.floor(sx)
      const right = Math.min(width - 1, left + 1)
      const fx = sx - left
      for (let c = 0; c < 3; c++) {
        const a = pixels[(top * width + left) * 4 + c] * (1 - fx) + pixels[(top * width + right) * 4 + c] * fx
        const b = pixels[(bottom * width + left) * 4 + c] * (1 - fx) + pixels[(bottom * width + right) * 4 + c] * fx
        const value = Math.round(a * (1 - fy) + b * fy)
        rgb[(y * size + x) * 3 + c] = value
        max = Math.max(max, value)
      }
    }
  }
  const input = new Float32Array(count * 3)
  const mean = [.485, .456, .406]
  const std = [.229, .224, .225]
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) input[c * count + i] = (rgb[i * 3 + c] / max - mean[c]) / std[c]
  }
  const root = new URL(`${import.meta.env.BASE_URL}models/`, self.location.origin)
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = {
    mjs: new URL('1.7.0-r2/onnxruntime-web/ort-wasm-simd-threaded.mjs', root).href,
    wasm: new URL('1.7.0-r2/onnxruntime-web/ort-wasm-simd-threaded.wasm', root).href
  }
  progress('fetch:model', 0, 1)
  let bytes
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    try {
      const response = await fetch(new URL('u2netp-v1/model.onnx', root), { credentials: 'omit', signal: controller.signal })
      if (!response.ok) throw new Error('model: ' + response.status)
      bytes = await response.arrayBuffer()
      break
    } catch (error) {
      if (attempt === 1) throw error
    } finally { clearTimeout(timer) }
  }
  let session, tensor, outputs
  try {
    session = await ort.InferenceSession.create(bytes, {
      executionProviders: ['wasm'],
      executionMode: 'sequential',
      graphOptimizationLevel: 'all',
      enableCpuMemArena: false,
      enableMemPattern: false
    })
    bytes = null
    progress('compute:inference', 0, 1)
    tensor = new ort.Tensor('float32', input, [1, 3, size, size])
    outputs = await session.run({ [session.inputNames[0]]: tensor }, [session.outputNames[0]])
    const mask = outputs[session.outputNames[0]].data
    if (mask.length !== count) throw new Error('invalid mask')
    let low = Infinity, high = -Infinity
    for (const value of mask) { low = Math.min(low, value); high = Math.max(high, value) }
    const range = high - low
    if (!Number.isFinite(range)) throw new Error('invalid mask')
    progress('compute:mask', 0, 1)
    for (let y = 0; y < height; y++) {
      const sy = Math.max(0, Math.min(size - 1, (y + .5) * size / height - .5))
      const top = Math.floor(sy), bottom = Math.min(size - 1, top + 1), fy = sy - top
      for (let x = 0; x < width; x++) {
        const sx = Math.max(0, Math.min(size - 1, (x + .5) * size / width - .5))
        const left = Math.floor(sx), right = Math.min(size - 1, left + 1), fx = sx - left
        const a = mask[top * size + left] * (1 - fx) + mask[top * size + right] * fx
        const b = mask[bottom * size + left] * (1 - fx) + mask[bottom * size + right] * fx
        const alpha = range > 1e-6 ? (a * (1 - fy) + b * fy - low) / range : high
        const i = (y * width + x) * 4 + 3
        pixels[i] = Math.round(pixels[i] * Math.max(0, Math.min(1, alpha)))
      }
    }
    return new Blob([pixels], { type: file.type })
  } finally {
    tensor?.dispose()
    if (outputs) for (const output of Object.values(outputs)) output.dispose()
    await session?.release()
  }
}
