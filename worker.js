import { removeBackground } from '@imgly/background-removal'

self.onmessage = async ({ data }) => {
  try {
    let device = data.device
    if (device === 'gpu') {
      const adapter = await navigator.gpu?.requestAdapter()
      if (!adapter) device = 'cpu'
    }
    const blob = await removeBackground(data.file, {
      publicPath: new URL(`${import.meta.env.BASE_URL}models/1.7.0/`, self.location.origin).href,
      model: 'isnet_fp16',
      device,
      output: { format: 'image/png' },
      fetchArgs: { credentials: 'omit' },
      progress: (key, current, total) => self.postMessage({ progress: { key, current, total } })
    })
    self.postMessage({ blob })
  } catch (error) {
    console.error(error)
    self.postMessage(data.device === 'gpu'
      ? { fallback: true }
      : { error: 'couldnt remove the background. try another image' })
  }
}
