export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t) => {
  t = clamp(t)
  return t * t * (3 - 2 * t)
}
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3)
export const damp = (cur, target, k, dt) => lerp(cur, target, 1 - Math.exp(-k * dt))
export const dampAngle = (cur, target, k, dt) => {
  let d = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return cur + d * (1 - Math.exp(-k * dt))
}
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a)
