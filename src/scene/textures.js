import * as THREE from 'three'

const cache = {}
const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const finish = (c, { srgb = false, repeat = null } = {}) => {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
  }
  t.anisotropy = 4
  return t
}

// Hammered-metal / grain bump map
export function noiseTexture(size = 256, repeat = 3) {
  const key = `n${size}${repeat}`
  if (cache[key]) return cache[key]
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const grid = []
  for (let o = 0; o < 3; o++) {
    const n = 8 << o
    grid.push({ n, v: Array.from({ length: n * n }, Math.random) })
  }
  const sample = ({ n, v }, x, y) => {
    const fx = (x / size) * n, fy = (y / size) * n
    const x0 = Math.floor(fx) % n, y0 = Math.floor(fy) % n
    const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n
    const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy)
    const a = v[y0 * n + x0] * (1 - tx) + v[y0 * n + x1] * tx
    const b = v[y1 * n + x0] * (1 - tx) + v[y1 * n + x1] * tx
    return a * (1 - ty) + b * ty
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = (sample(grid[0], x, y) * 0.5 + sample(grid[1], x, y) * 0.3 + sample(grid[2], x, y) * 0.2) * 255
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = val
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return (cache[key] = finish(c, { repeat }))
}

// Saffron cloth with woven pattern and gold border
export function clothTexture() {
  if (cache.cloth) return cache.cloth
  const c = canvas(256, 256)
  const x = c.getContext('2d')
  x.fillStyle = '#e8660e'
  x.fillRect(0, 0, 256, 256)
  x.globalAlpha = 0.18
  for (let i = 0; i < 256; i += 3) {
    x.fillStyle = i % 6 ? '#000' : '#fff'
    x.fillRect(i, 0, 1, 256)
    x.fillRect(0, i, 256, 1)
  }
  x.globalAlpha = 1
  x.fillStyle = '#f2c14e'
  x.fillRect(0, 0, 256, 22)
  x.fillRect(0, 234, 256, 22)
  x.fillStyle = '#9e1b1b'
  for (let i = 0; i < 256; i += 32) {
    x.beginPath()
    x.moveTo(i + 16, 4)
    x.lineTo(i + 28, 11)
    x.lineTo(i + 16, 18)
    x.lineTo(i + 4, 11)
    x.fill()
  }
  return (cache.cloth = finish(c, { srgb: true }))
}

export function groundTexture() {
  if (cache.ground) return cache.ground
  const c = canvas(512, 512)
  const x = c.getContext('2d')
  x.fillStyle = '#17120f'
  x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 6000; i++) {
    const v = Math.floor(Math.random() * 40)
    x.fillStyle = `rgb(${v + 16},${v + 12},${v + 10})`
    x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3)
  }
  return (cache.ground = finish(c, { srgb: true, repeat: 28 }))
}

export function rangoliTexture() {
  if (cache.rangoli) return cache.rangoli
  const S = 1024
  const c = canvas(S, S)
  const x = c.getContext('2d')
  x.translate(S / 2, S / 2)
  const cols = ['#ff7a1a', '#e8284a', '#f6c453', '#fff3d6', '#2bb673', '#7b3fe4']
  const ring = (r, n, pr, col, shape = 'petal') => {
    for (let i = 0; i < n; i++) {
      x.save()
      x.rotate((i / n) * Math.PI * 2)
      x.translate(0, -r)
      x.fillStyle = col
      x.beginPath()
      if (shape === 'petal') {
        x.moveTo(0, 0)
        x.quadraticCurveTo(pr, -pr * 1.2, 0, -pr * 2.4)
        x.quadraticCurveTo(-pr, -pr * 1.2, 0, 0)
      } else x.arc(0, 0, pr, 0, Math.PI * 2)
      x.fill()
      x.restore()
    }
  }
  x.strokeStyle = '#fff3d6'
  x.lineWidth = 6
  x.beginPath(); x.arc(0, 0, 490, 0, Math.PI * 2); x.stroke()
  x.lineWidth = 3
  x.beginPath(); x.arc(0, 0, 470, 0, Math.PI * 2); x.stroke()
  ring(440, 48, 14, cols[3], 'dot')
  ring(380, 24, 34, cols[1])
  ring(330, 24, 30, cols[0])
  ring(260, 16, 40, cols[2])
  ring(200, 16, 30, cols[4])
  ring(140, 12, 34, cols[1])
  ring(90, 8, 30, cols[5])
  ring(0, 1, 36, cols[2], 'dot')
  x.globalAlpha = 1
  return (cache.rangoli = finish(c, { srgb: true }))
}

export function glowTexture() {
  if (cache.glow) return cache.glow
  const c = canvas(128, 128)
  const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return (cache.glow = finish(c, { srgb: true }))
}

export function disposeTextures() {
  Object.values(cache).forEach((t) => t.dispose())
  Object.keys(cache).forEach((k) => delete cache[k])
}
