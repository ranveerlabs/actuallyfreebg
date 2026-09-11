export async function selectDevice(gpu, small = false) {
  if (!gpu?.requestAdapter) return 'cpu'
  let timer
  try {
    return await Promise.race([
      (async () => {
        const adapter = await gpu.requestAdapter()
        if (!adapter || (!small && !adapter.features.has('shader-f16'))) return 'cpu'
        const device = await adapter.requestDevice({ requiredFeatures: small ? [] : ['shader-f16'] })
        device.destroy()
        return 'gpu'
      })(),
      new Promise(resolve => { timer = setTimeout(() => resolve('cpu'), 3000) })
    ])
  } catch {
    return 'cpu'
  } finally {
    clearTimeout(timer)
  }
}
