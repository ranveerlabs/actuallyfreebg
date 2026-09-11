import { removeBackground } from '@imgly/background-removal'
import { selectDevice } from './capabilities.js'

self.onmessage = async ({ data }) => {
  let device = 'cpu'
  try {
    device = data.device === 'cpu' ? 'cpu' : await selectDevice(navigator.gpu, data.small)
    self.postMessage({ backend: device })
    const blob = await removeBackground(data.file, {
      publicPath: new URL(`${import.meta.env.BASE_URL}models/1.7.0-r2/`, self.location.origin).href,
      model: data.small ? 'isnet_quint8' : 'isnet_fp16',
      device,
      output: { format: data.raw ? 'image/x-rgba8' : 'image/png' },
      fetchArgs: { credentials: 'omit' },
      progress: (key, current, total) => self.postMessage({ progress: { key, current, total } })
    })
    self.postMessage({ blob, raw: data.raw })
  } catch (error) {
    console.error(error)
    self.postMessage(device === 'gpu'
      ? { fallback: true }
      : { error: 'couldnt finish. check your connection and try again' })
  }
}
