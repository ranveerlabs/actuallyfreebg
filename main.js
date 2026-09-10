const input = document.querySelector('#file')
const pick = document.querySelector('#pick')
const status = document.querySelector('#status')
const result = document.querySelector('#result')
const preview = document.querySelector('#preview')
const save = document.querySelector('#save')
const compare = document.querySelector('#compare')
const cancel = document.querySelector('#cancel')
let worker
let busy = false
let original
let output
let showingOriginal = false

function stop() {
  worker?.terminate()
  worker = null
  busy = false
  pick.disabled = false
  cancel.hidden = true
  document.querySelector('main').setAttribute('aria-busy', 'false')
}

async function process(file) {
  if (!file || busy) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    status.textContent = 'choose a PNG, JPG or WebP image'
    return
  }
  if (file.size > 30 * 1024 * 1024) {
    status.textContent = 'this file is too large for the browser. try one under 30 MB'
    return
  }
  busy = true
  pick.disabled = true
  try {
    const bitmap = await createImageBitmap(file)
    const pixels = bitmap.width * bitmap.height
    bitmap.close()
    if (pixels > 25000000) throw new Error('try an image under 25 megapixels')
  } catch (error) {
    status.textContent = error.message === 'try an image under 25 megapixels' ? error.message : 'couldnt read this image. try another file'
    stop()
    return
  }
  URL.revokeObjectURL(original)
  URL.revokeObjectURL(output)
  original = URL.createObjectURL(file)
  output = null
  preview.src = original
  preview.alt = 'original image'
  result.hidden = false
  save.hidden = true
  save.removeAttribute('href')
  compare.hidden = true
  cancel.hidden = false
  document.querySelector('main').setAttribute('aria-busy', 'true')
  status.textContent = 'loading the remover. first run takes a little longer'
  worker ??= new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    if (data.progress) {
      const { key, current, total } = data.progress
      status.textContent = key.startsWith('fetch:')
        ? `loading the remover ${Math.round(current / total * 100)}%`
        : 'removing the background'
      return
    }
    if (data.error) {
      status.textContent = data.error
      stop()
      return
    }
    output = URL.createObjectURL(data.blob)
    preview.src = output
    preview.alt = 'image with the background removed'
    showingOriginal = false
    compare.textContent = 'show original'
    compare.setAttribute('aria-pressed', 'false')
    save.href = output
    save.download = `${file.name.replace(/\.[^.]+$/, '')}-actuallyfree.png`
    save.hidden = false
    compare.hidden = false
    cancel.hidden = true
    busy = false
    pick.disabled = false
    document.querySelector('main').setAttribute('aria-busy', 'false')
    status.textContent = 'done'
  }
  worker.onerror = () => {
    status.textContent = 'the remover stopped. try a smaller image'
    stop()
  }
  worker.postMessage({ file, origin: location.origin })
}

pick.onclick = () => input.click()
input.onchange = () => { process(input.files[0]); input.value = '' }
cancel.onclick = () => { stop(); status.textContent = 'cancelled'; result.hidden = true }
compare.onclick = () => {
  showingOriginal = !showingOriginal
  preview.src = showingOriginal ? original : output
  preview.alt = showingOriginal ? 'original image' : 'image with the background removed'
  compare.textContent = showingOriginal ? 'show cutout' : 'show original'
  compare.setAttribute('aria-pressed', String(showingOriginal))
}
document.addEventListener('dragover', event => { event.preventDefault() })
document.addEventListener('drop', event => { event.preventDefault(); process(event.dataTransfer.files[0]) })
document.addEventListener('paste', event => {
  const file = [...event.clipboardData.items].find(item => item.type.startsWith('image/'))?.getAsFile()
  if (file) { event.preventDefault(); process(file) }
})
