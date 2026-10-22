import { useSyncExternalStore } from 'react'
import { director } from '../animation/DahanTimeline'
import { createStore, loadPref, savePref } from '../utils/store'

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 820)

export const QUALITY = {
  high: { particleScale: 1, dpr: [1, 2], composer: true, dof: true, msaa: 4, shadow: 2048, stars: 2500 },
  medium: { particleScale: 0.6, dpr: [1, 1.5], composer: true, dof: false, msaa: 0, shadow: 1024, stars: 1200 },
  low: { particleScale: 0.3, dpr: [1, 1], composer: false, dof: false, msaa: 0, shadow: 512, stars: 500 },
}

export const controls = createStore({
  autoRotate: !reducedMotion,
  explore: false,
  reduced: loadPref('dv4.reduced', !!reducedMotion),
  baseQuality: isMobile ? 'medium' : 'high',
  quality: isMobile ? 'medium' : 'high', // may be lowered dynamically
  ready: false,
  loadStep: 0,
})

// Imperative one-shot commands consumed by the 3D scene each frame.
const queue = []
export const commands = {
  push: (c) => queue.push(c),
  // remove and return only commands whose type is in `types`
  drain: (types) => {
    if (!queue.length) return null
    const out = []
    for (let i = queue.length - 1; i >= 0; i--) {
      if (types.includes(queue[i].type)) out.unshift(...queue.splice(i, 1))
    }
    return out.length ? out : null
  },
}

export const effectiveQuality = () => {
  const s = controls.get()
  return s.reduced ? 'low' : s.quality
}
export const particleScale = () => QUALITY[effectiveQuality()].particleScale

export const actions = {
  toggleAutoRotate: () => controls.set((s) => ({ autoRotate: !s.autoRotate })),
  setExplore: (explore) => controls.set({ explore }),
  rotate: (dir) => commands.push({ type: 'rotate', dir }),
  zoom: (dir) => commands.push({ type: 'zoom', dir }),
  resetCamera: () => {
    commands.push({ type: 'reset' })
    controls.set({ autoRotate: !reducedMotion, explore: false })
  },
  setReduced: (reduced) => {
    savePref('dv4.reduced', reduced)
    controls.set({ reduced })
  },
  degrade: () => {
    const s = controls.get()
    const next = s.quality === 'high' ? 'medium' : 'low'
    if (next !== s.quality) controls.set({ quality: next })
  },
  loaded: (step) => {
    const s = controls.get()
    controls.set({ loadStep: Math.max(s.loadStep, step) })
  },
  markReady: () => controls.set({ ready: true }),
}

export function useControls() {
  return controls.use()
}

export function useDahan() {
  return useSyncExternalStore(director.subscribe, director.getSnapshot, director.getSnapshot)
}
