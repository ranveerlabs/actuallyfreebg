import { prepare, encode } from './image.js'

const input = document.querySelector('#file')
const pick = document.querySelector('#pick')
const status = document.querySelector('#status')
const result = document.querySelector('#result')
const preview = document.querySelector('#preview')
const save = document.querySelector('#save')
const compare = document.querySelector('#compare')
const cancel = document.querySelector('#cancel')
const small = navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
let worker, controller, timer, original, output
let busy = false
let showingOriginal = false
let serial = 0

function stop() {
  serial++
  clearTimeout(timer)
  controller?.abort()
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
  stop()
  const job = serial
  controller = new AbortController()
  busy = true
  pick.disabled = true
  cancel.hidden = false
  document.querySelector('main').setAttribute('aria-busy', 'true')
  preview.removeAttribute('src')
  save.removeAttribute('href')
  URL.revokeObjectURL(original)
  URL.revokeObjectURL(output)
  original = output = null
  result.hidden = save.hidden = compare.hidden = true
  status.textContent = 'opening image'
  const name = `${file.name.replace(/\.[^.]+$/, '')}-actuallyfree.png`
  let image
  try {
    image = await prepare(file, small, controller.signal)
    if (job !== serial) return
  } catch (error) {
    if (job !== serial) return
    status.textContent = error.message
    stop()
    return
  }
  file = null
  original = URL.createObjectURL(image.preview)
  image.preview = null
  preview.src = original
  preview.alt = 'original image'
  result.hidden = false
  status.textContent = 'loading the remover. first run takes a little longer'
  const run = device => {
    clearTimeout(timer)
    worker?.terminate()
    let backend = device
    let current
    const failed = () => {
      if (job !== serial || worker !== current) return
      if (backend === 'gpu') {
        status.textContent = 'trying the CPU instead'
        run('cpu')
      } else {
        status.textContent = 'couldnt finish. try again with a smaller image'
        stop()
      }
    }
    const watch = () => {
      clearTimeout(timer)
      timer = setTimeout(failed, 180000)
    }
    try {
      current = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
      worker = current
      current.onmessage = async ({ data }) => {
        if (job !== serial || worker !== current) return
        watch()
        if (data.backend) { backend = data.backend; return }
        if (data.fallback) {
          status.textContent = 'trying the CPU instead'
          run('cpu')
          return
        }
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
        clearTimeout(timer)
        current.terminate()
        worker = null
        try {
          const blob = data.raw ? await encode(data.blob, image.width, image.height) : data.blob
          if (job !== serial) return
          output = URL.createObjectURL(blob)
          preview.src = output
          preview.alt = 'image with the background removed'
          showingOriginal = false
          compare.textContent = 'show original'
          compare.setAttribute('aria-pressed', 'false')
          save.href = output
          save.download = name
          save.hidden = compare.hidden = false
          status.textContent = image.resized ? `done / resized to ${image.width} x ${image.height}` : 'done'
          image.file = null
          stop()
        } catch {
          if (job !== serial) return
          status.textContent = 'couldnt save the cutout. try a smaller image'
          stop()
        }
      }
      current.onerror = failed
      current.onmessageerror = failed
      current.postMessage({ file: image.file, device, small, raw: image.raw })
      watch()
    } catch {
      status.textContent = 'couldnt start the remover. try updating your browser'
      stop()
    }
  }
  run('gpu')
}

pick.onclick = () => input.click()
input.onchange = () => { process(input.files[0]); input.value = '' }
cancel.onclick = () => {
  stop()
  preview.removeAttribute('src')
  URL.revokeObjectURL(original)
  URL.revokeObjectURL(output)
  original = output = null
  status.textContent = 'cancelled'
  result.hidden = true
}
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
