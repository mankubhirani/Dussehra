import { useSyncExternalStore } from 'react'

// Tiny external store: immutable snapshots, subscribe/getSnapshot for React.
export function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch
      state = { ...state, ...next }
      listeners.forEach((l) => l())
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    use() {
      return useSyncExternalStore(this.subscribe, this.get, this.get)
    },
  }
}

export function loadPref(key, fallback) {
  try {
    const v = window.localStorage.getItem(key)
    return v == null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
export function savePref(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}
