import { clamp, easeInOut } from '../utils/math'

export const STAGES = [
  { id: 'intro', dur: 3.5, en: 'Night Falls', hi: 'रात्रि' },
  { id: 'reveal', dur: 5, en: 'Ravana Reveal', hi: 'रावण दर्शन' },
  { id: 'prepare', dur: 5, en: 'Bow Preparation', hi: 'धनुष सज्जा' },
  { id: 'release', dur: 0.7, en: 'Arrow Release', hi: 'बाण प्रक्षेपण' },
  { id: 'flight', dur: 1.9, en: 'Arrow Flight', hi: 'बाण उड़ान' },
  { id: 'impact', dur: 1.4, en: 'Impact', hi: 'प्रहार' },
  { id: 'ignition', dur: 4.5, en: 'Ignition', hi: 'अग्नि प्रज्वलन' },
  { id: 'burning', dur: 8, en: 'Ravan Dahan', hi: 'रावण दहन' },
  { id: 'collapse', dur: 5, en: 'Effigy Turns to Embers', hi: 'भस्म' },
  { id: 'fireworks', dur: 10, en: 'Fireworks Finale', hi: 'आतिशबाज़ी' },
  { id: 'celebration', dur: Infinity, en: 'Victory of Good', hi: 'विजय' },
]
export const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]))
const FINITE_TOTAL = STAGES.reduce((a, s) => (isFinite(s.dur) ? a + s.dur : a), 0)
const RELEASE_FLIGHT = STAGES[3].dur + STAGES[4].dur

class Dahan {
  constructor() {
    this.listeners = new Set() // react subscribers
    this.handlers = new Set() // event handlers
    this.maxDt = 0.1
    this.timeScale = 1
    this.visual = {}
    this._snap = null
    this._lastEmit = 0
    this.reset(true)
  }

  // ---- subscriptions -------------------------------------------------
  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getSnapshot = () => this._snap
  on(fn) {
    this.handlers.add(fn)
    return () => this.handlers.delete(fn)
  }
  _emit(type, extra) {
    this.handlers.forEach((h) => h({ type, stageIndex: this.stageIndex, id: this.stageId, ...extra }))
  }
  _publish() {
    this._snap = {
      mode: this.mode,
      paused: this.paused,
      stageIndex: this.stageIndex,
      stageId: this.stageId,
      progress: this.progress,
    }
    this.listeners.forEach((l) => l())
  }

  get stageId() {
    return this.stageIndex < 0 ? 'idle' : STAGES[this.stageIndex].id
  }
  get running() {
    return this.mode === 'running' || this.mode === 'finished'
  }
  get progress() {
    if (this.stageIndex < 0) return 0
    if (this.stageIndex >= STAGES.length - 1) return 1
    let done = 0
    for (let i = 0; i < this.stageIndex; i++) done += STAGES[i].dur
    return clamp((done + this.stageTime) / FINITE_TOTAL)
  }

  // ---- control -------------------------------------------------------
  reset(silent = false) {
    this.mode = 'idle'
    this.paused = false
    this.pauseReason = null
    this.stageIndex = -1
    this.stageTime = 0
    this.totalTime = 0
    this._computeVisual()
    this._publish()
    if (!silent) this._emit('reset')
  }
  start() {
    if (this.mode !== 'idle') return false
    this.mode = 'running'
    this.paused = false
    this.stageIndex = 0
    this.stageTime = 0
    this._computeVisual()
    this._publish()
    this._emit('start')
    this._emit('stage')
    return true
  }
  replay() {
    this.reset()
    this.start()
  }
  pause(reason = 'user') {
    if (!this.running || this.paused) return
    this.paused = true
    this.pauseReason = reason
    this._publish()
    this._emit('pause', { reason })
  }
  resume(reason) {
    if (!this.paused) return
    if (reason && this.pauseReason !== reason && reason !== 'user') return
    this.paused = false
    this.pauseReason = null
    this._publish()
    this._emit('resume')
  }
  togglePause() {
    this.paused ? this.resume('user') : this.pause('user')
  }
  skip() {
    if (this.mode !== 'running') return
    this.stageIndex = STAGES.length - 1
    this.stageTime = 0
    this.mode = 'finished'
    this._computeVisual()
    this._publish()
    this._emit('stage', { skipped: true })
    this._emit('finish', { skipped: true })
  }

  tick(dtRaw) {
    if (!this.running || this.paused) return
    const dt = Math.min(dtRaw, this.maxDt) * this.timeScale
    this.stageTime += dt
    this.totalTime += dt
    let changed = false
    while (this.stageIndex < STAGES.length - 1 && this.stageTime >= STAGES[this.stageIndex].dur) {
      this.stageTime -= STAGES[this.stageIndex].dur
      this.stageIndex++
      changed = true
      if (this.stageIndex === STAGES.length - 1) this.mode = 'finished'
      this._emit('stage')
      if (this.mode === 'finished') this._emit('finish', { skipped: false })
    }
    this._computeVisual()
    const now = performance.now()
    if (changed || now - this._lastEmit > 120) {
      this._lastEmit = now
      this._publish()
    }
  }

  // ---- derived visual state (pure function of stage + time) ---------
  _computeVisual() {
    const v = this.visual
    const i = this.stageIndex
    const st = this.stageTime
    const id = this.stageId
    const dur = i >= 0 ? STAGES[i].dur : 1
    const u = isFinite(dur) ? clamp(st / dur) : 0
    const at = (name) => i >= STAGE_INDEX[name]
    v.stageU = u
    v.draw = 0
    v.arrow = 'hidden'
    v.flightU = 0
    v.flash = 0
    v.spread = 0
    v.fire = 0
    v.char = 0
    v.dissolve = 0
    v.fireworks = at('fireworks')
    v.celebrate = 0
    v.bowRaise = 0
    v.trajectory = 0
    v.cinematic = i >= 0

    if (id === 'prepare') {
      v.draw = easeInOut((u - 0.2) / 0.65)
      if (u > 0.15) v.arrow = 'nocked'
      v.trajectory = clamp((u - 0.5) / 0.2)
    } else if (id === 'release') {
      v.draw = 1 - clamp(st / 0.1)
      v.arrow = 'flying'
    } else if (id === 'flight') {
      v.arrow = 'flying'
    } else if (id === 'impact') {
      v.arrow = 'stuck'
    } else if (id === 'ignition') {
      v.arrow = u < 0.35 ? 'stuck' : 'gone'
    }
    if (id === 'release') v.flightU = clamp(st / RELEASE_FLIGHT)
    else if (id === 'flight') v.flightU = clamp((STAGES[3].dur + st) / RELEASE_FLIGHT)
    else if (at('impact')) v.flightU = 1

    if (id === 'impact') v.flash = Math.exp(-st * 3.2)
    if (id === 'ignition') {
      v.spread = easeInOut(u)
      v.fire = Math.pow(easeInOut(u), 0.8) * 0.9
    } else if (id === 'burning') {
      v.spread = 1
      v.fire = 1
      v.char = u * 0.8
    } else if (id === 'collapse') {
      v.spread = 1
      v.fire = 1 - 0.45 * u
      v.char = 0.8 + 0.2 * u
      v.dissolve = easeInOut((u - 0.05) / 0.95)
    } else if (id === 'fireworks') {
      v.spread = 1
      v.fire = 0.55 - 0.3 * u
      v.char = 1
      v.dissolve = 1
    } else if (id === 'celebration') {
      v.spread = 1
      v.fire = 0.22
      v.char = 1
      v.dissolve = 1
      v.celebrate = clamp(st / 1.5)
    }
    if (at('fireworks')) v.bowRaise = easeInOut(id === 'fireworks' ? u * 2 : 1)
  }
}

export const director = new Dahan()
if (typeof window !== 'undefined') window.__dahan = director
