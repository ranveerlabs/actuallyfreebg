import { removeBackground } from '@imgly/background-removal'

self.onmessage = async ({ data }) => {
  try {
    const blob = await removeBackground(data.file, {
      publicPath: new URL('/models/', data.origin).href,
      model: 'isnet_fp16',
      device: 'cpu',
      output: { format: 'image/png' },
      fetchArgs: { credentials: 'omit' },
      progress: (key, current, total) => self.postMessage({ progress: { key, current, total } })
    })
    self.postMessage({ blob })
  } catch (error) {
    console.error(error)
    self.postMessage({ error: 'couldnt remove the background. try another image' })
  }
}
