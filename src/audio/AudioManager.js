import { loadPref, savePref } from '../utils/store'

// Fully synthesized audio (Web Audio API): no copyrighted samples, no external files.
const BPM = 112
const STEP = 60 / BPM / 4
const SA = 293.66 // D4
const BHAIRAV = [0, 1, 4, 5, 7, 8, 11, 12]
const hz = (semi, base = SA) => base * Math.pow(2, semi / 12)

const DHAG = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0]
const TILLI = [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1]
const NAGADA = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0]
// [step, semitone, lengthSteps]
const PHRASE = [
  [0, 0, 4], [4, 4, 2], [6, 5, 2], [8, 7, 4], [12, 5, 2], [14, 4, 2],
  [16, 4, 4], [20, 1, 2], [22, 0, 2], [24, 1, 4], [28, 4, 2], [30, 7, 2],
  [32, 8, 4], [36, 7, 2], [38, 5, 2], [40, 7, 4], [44, 12, 4],
  [48, 11, 2], [50, 8, 2], [52, 7, 2], [54, 5, 2], [56, 4, 2], [58, 1, 2], [60, 0, 4],
]

class AudioManager {
  constructor() {
    const p = loadPref('dv4.audio', {})
    this.state = {
      unlocked: false,
      musicOn: false,
      muted: !!p.muted,
      master: p.master ?? 0.8,
      music: p.music ?? 0.7,
      sfx: p.sfx ?? 0.9,
    }
    this.listeners = new Set()
    this.snapshot = { ...this.state }
    this.ctx = null
    this.intensity = 0
    this.step = 0
    this.fire = null
    this.activeSfx = 0
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getSnapshot = () => this.snapshot
  _set(patch) {
    Object.assign(this.state, patch)
    this.snapshot = { ...this.state }
    savePref('dv4.audio', { muted: this.state.muted, master: this.state.master, music: this.state.music, sfx: this.state.sfx })
    this.listeners.forEach((l) => l())
    this._applyGains()
  }

  // Must be called from a user gesture.
  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return false
      const ctx = (this.ctx = new AC())
      this.master = ctx.createGain()
      this.musicBus = ctx.createGain()
      this.sfxBus = ctx.createGain()
      this.comp = ctx.createDynamicsCompressor()
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 512
      this.musicBus.connect(this.master)
      this.sfxBus.connect(this.master)
      this.master.connect(this.comp)
      this.comp.connect(this.analyser)
      this.analyser.connect(ctx.destination)
      this.reverb = ctx.createConvolver()
      this.reverb.buffer = this._impulse(2.2)
      this.reverbGain = ctx.createGain()
      this.reverbGain.gain.value = 0.35
      this.reverb.connect(this.reverbGain)
      this.reverbGain.connect(this.master)
      this.white = this._noise(2, false)
      this.brown = this._noise(4, true)
      this.master.gain.value = 0
      this.musicBus.gain.value = 0
      this.sfxBus.gain.value = 1
    }
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume()
    } catch {
      /* ignore */
    }
    this._set({ unlocked: true })
    return true
  }

  _applyGains() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const s = this.state
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master * s.master, t, 0.12)
    this.musicBus.gain.setTargetAtTime(s.musicOn ? s.music * s.music : 0, t, 0.35)
    this.sfxBus.gain.setTargetAtTime(s.sfx * s.sfx, t, 0.05)
  }

  // ---- user controls -------------------------------------------------
  async setMusic(on) {
    if (on) await this.unlock()
    if (!this.ctx) return
    this._set({ musicOn: on })
    if (on) this._startScheduler()
    else this._stopScheduler(1.2)
  }
  toggleMusic() {
    return this.setMusic(!this.state.musicOn)
  }
  setMuted(muted) {
    this._set({ muted })
  }
  setVolume(kind, v) {
    this._set({ [kind]: Math.min(1, Math.max(0, v)) })
  }
  setIntensity(n) {
    this.intensity = n
  }
  suspend() {
    this.ctx?.state === 'running' && this.ctx.suspend()
  }
  resume() {
    this.ctx?.state === 'suspended' && this.ctx.resume()
  }
  reset() {
    this.stopFire()
    this.intensity = 0
  }
  dispose() {
    this._stopScheduler(0)
    this.stopFire()
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
    }
    this._set({ unlocked: false, musicOn: false })
  }

  // ---- helpers -------------------------------------------------------
  _impulse(sec) {
    const c = this.ctx
    const len = c.sampleRate * sec
    const buf = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    return buf
  }
  _noise(sec, brown) {
    const c = this.ctx
    const len = c.sampleRate * sec
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (brown) {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else d[i] = w
    }
    return buf
  }
  _src(buf, loop = false) {
    const s = this.ctx.createBufferSource()
    s.buffer = buf
    s.loop = loop
    return s
  }
  _out(node, bus, { pan = 0, send = 0 } = {}) {
    const c = this.ctx
    let tail = node
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      node.connect(p)
      tail = p
    }
    tail.connect(bus)
    if (send > 0) {
      const g = c.createGain()
      g.gain.value = send
      tail.connect(g)
      g.connect(this.reverb)
    }
  }
  _env(t, a, peak, d, g) {
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }
  _osc(type, f, t, dur) {
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    o.start(t)
    o.stop(t + dur)
    return o
  }
  _burst(t, dur, { type = 'bandpass', f = 2000, q = 1, gain = 0.5, bus = this.sfxBus, pan = 0, send = 0, attack = 0.002 } = {}) {
    const n = this._src(this.white)
    const flt = this.ctx.createBiquadFilter()
    flt.type = type
    flt.frequency.value = f
    flt.Q.value = q
    const g = this.ctx.createGain()
    n.connect(flt)
    flt.connect(g)
    this._env(t, attack, gain, dur, g)
    this._out(g, bus, { pan, send })
    n.start(t, Math.random())
    n.stop(t + dur + 0.05)
  }

  // ---- drums ---------------------------------------------------------
  _dhag(t, v = 1) {
    const g = this.ctx.createGain()
    const o = this._osc('sine', 150, t, 0.5)
    o.frequency.exponentialRampToValueAtTime(52, t + 0.14)
    o.connect(g)
    this._env(t, 0.003, 0.9 * v, 0.38, g)
    this._out(g, this.musicBus, { send: 0.12 })
    this._burst(t, 0.03, { type: 'lowpass', f: 900, gain: 0.35 * v, bus: this.musicBus })
  }
  _tilli(t, v = 1) {
    const g = this.ctx.createGain()
    const o = this._osc('triangle', 540, t, 0.12)
    o.connect(g)
    this._env(t, 0.002, 0.28 * v, 0.07, g)
    this._out(g, this.musicBus)
    this._burst(t, 0.06, { f: 3200, q: 1.1, gain: 0.35 * v, bus: this.musicBus })
  }
  _nagada(t, v = 1) {
    const g = this.ctx.createGain()
    const o = this._osc('sine', 190, t, 0.4)
    o.frequency.exponentialRampToValueAtTime(105, t + 0.1)
    o.connect(g)
    this._env(t, 0.003, 0.45 * v, 0.22, g)
    this._out(g, this.musicBus, { send: 0.2, pan: -0.2 })
  }
  _tasha(t, v = 1) {
    this._burst(t, 0.035, { type: 'highpass', f: 5000, gain: 0.12 * v, bus: this.musicBus, pan: 0.2 })
  }
  _shehnai(f, t, dur, vel = 1) {
    const c = this.ctx
    const out = c.createGain()
    const bp1 = c.createBiquadFilter()
    bp1.type = 'bandpass'
    bp1.frequency.value = 1300
    bp1.Q.value = 1.4
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3800
    const lfo = this._osc('sine', 5.4, t, dur + 0.3)
    const lg = c.createGain()
    lg.gain.value = 7
    lfo.connect(lg)
    ;[-6, 6].forEach((det) => {
      const o = this._osc('sawtooth', f * 0.985, t, dur + 0.3)
      o.frequency.exponentialRampToValueAtTime(f, t + 0.07) // meend glide
      o.detune.value = det
      lg.connect(o.detune)
      o.connect(bp1)
      o.connect(lp)
    })
    const mix = c.createGain()
    mix.gain.value = 0.5
    bp1.connect(mix)
    lp.connect(mix)
    mix.connect(out)
    out.gain.setValueAtTime(0.0001, t)
    out.gain.linearRampToValueAtTime(0.16 * vel, t + 0.06)
    out.gain.setValueAtTime(0.14 * vel, t + dur)
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25)
    this._out(out, this.musicBus, { send: 0.45, pan: 0.1 })
  }
  _drone() {
    const c = this.ctx
    const t = c.currentTime
    const out = c.createGain()
    out.gain.value = 0.0001
    out.gain.linearRampToValueAtTime(0.07, t + 2)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 650
    ;[[SA / 2, 'sawtooth'], [SA / 2 * 1.5, 'sawtooth'], [SA, 'sine']].forEach(([f, type]) => {
      const o = c.createOscillator()
      o.type = type
      o.frequency.value = f
      o.start(t)
      o.connect(lp)
      ;(this._droneNodes ||= []).push(o)
    })
    lp.connect(out)
    this._out(out, this.musicBus, { send: 0.3 })
    this._droneGain = out
  }
  _stopDrone(fade = 1) {
    if (!this._droneNodes) return
    const t = this.ctx.currentTime
    this._droneGain.gain.cancelScheduledValues(t)
    this._droneGain.gain.setTargetAtTime(0.0001, t, fade / 3 + 0.01)
    const nodes = this._droneNodes
    this._droneNodes = null
    setTimeout(() => nodes.forEach((o) => { try { o.stop() } catch { /* stopped */ } }), fade * 1000 + 400)
  }

  _startScheduler() {
    if (this._timer) return
    this._next = this.ctx.currentTime + 0.1
    if (!this._droneNodes) this._drone()
    this._timer = setInterval(() => this._tickScheduler(), 30)
  }
  _stopScheduler(fade) {
    if (this._timer) clearInterval(this._timer)
    this._timer = null
    if (this.ctx) this._stopDrone(fade)
  }
  _tickScheduler() {
    if (!this.ctx) return
    while (this._next < this.ctx.currentTime + 0.15) {
      this._scheduleStep(this.step, this._next)
      this._next += STEP * (this.intensity >= 3 ? 0.9 : 1)
      this.step = (this.step + 1) % 64
    }
  }
  _scheduleStep(step, t) {
    const lv = this.intensity
    const s = step % 16
    if (lv >= 0.5 && s % 4 === 0) this._nagada(t, lv >= 1 ? 0.7 : 0.35)
    if (lv >= 1 && (s === 0 || s === 8)) this._dhag(t, 0.8)
    if (lv >= 2) {
      if (DHAG[s]) this._dhag(t, 1)
      if (TILLI[s]) this._tilli(t, s % 4 === 0 ? 1 : 0.7)
      if (NAGADA[s]) this._nagada(t, 0.5)
      PHRASE.forEach(([ps, semi, len]) => {
        if (ps === step) this._shehnai(hz(BHAIRAV.includes(semi) ? semi : 0), t, len * STEP * 0.95)
      })
    }
    if (lv >= 3) {
      this._tasha(t, s % 2 ? 0.6 : 1)
      PHRASE.forEach(([ps, semi, len]) => {
        if (ps === step) this._shehnai(hz(semi, SA * 2) * 0.5 * 2, t, len * STEP * 0.8, 0.5)
      })
    }
  }

  // ---- sfx -----------------------------------------------------------
  play(name, opts = {}) {
    if (!this.ctx || this.state.muted || this.ctx.state !== 'running') return
    const fn = this['_sfx_' + name]
    if (!fn) return
    if (this.activeSfx > 40) return
    this.activeSfx++
    setTimeout(() => (this.activeSfx = Math.max(0, this.activeSfx - 1)), 1500)
    fn.call(this, this.ctx.currentTime + 0.01, opts)
  }
  _sfx_conch(t) {
    const c = this.ctx
    const g = c.createGain()
    const o1 = this._osc('sawtooth', 233, t, 3.4)
    const o2 = this._osc('square', 233 * 1.005, t, 3.4)
    o1.frequency.linearRampToValueAtTime(247, t + 1.2)
    o2.frequency.linearRampToValueAtTime(248, t + 1.2)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 700
    bp.Q.value = 2.5
    const am = this._osc('sine', 6, t, 3.4)
    const amg = c.createGain()
    amg.gain.value = 0.15
    am.connect(amg)
    amg.connect(g.gain)
    o1.connect(bp)
    o2.connect(bp)
    bp.connect(g)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.5, t + 0.9)
    g.gain.setValueAtTime(0.45, t + 2.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.4)
    this._out(g, this.sfxBus, { send: 0.6 })
    this._burst(t, 3, { type: 'bandpass', f: 1200, gain: 0.05, attack: 0.8 })
  }
  _sfx_bowDraw(t) {
    const c = this.ctx
    const g = c.createGain()
    const o = this._osc('triangle', 120, t, 3.6)
    o.frequency.linearRampToValueAtTime(260, t + 3.4)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    o.connect(lp)
    lp.connect(g)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.14, t + 3.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6)
    this._out(g, this.sfxBus)
    this._burst(t, 3.2, { f: 600, q: 4, gain: 0.04, attack: 2.5 })
  }
  _sfx_bowRelease(t) {
    const g = this.ctx.createGain()
    const o = this._osc('triangle', 330, t, 0.7)
    o.frequency.exponentialRampToValueAtTime(150, t + 0.5)
    o.connect(g)
    this._env(t, 0.002, 0.5, 0.5, g)
    this._out(g, this.sfxBus, { send: 0.15 })
    this._burst(t, 0.12, { f: 1800, q: 0.8, gain: 0.5 })
  }
  _sfx_whoosh(t, { dur = 2.4 } = {}) {
    const c = this.ctx
    const n = this._src(this.white)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 3
    bp.frequency.setValueAtTime(500, t)
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.45, t + dur * 0.85)
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
    const pan = c.createStereoPanner ? c.createStereoPanner() : null
    n.connect(bp)
    bp.connect(g)
    if (pan) {
      pan.pan.setValueAtTime(-0.6, t)
      pan.pan.linearRampToValueAtTime(0.3, t + dur)
      g.connect(pan)
      pan.connect(this.sfxBus)
    } else g.connect(this.sfxBus)
    n.start(t, 0.3)
    n.stop(t + dur + 0.1)
  }
  _sfx_impact(t) {
    const g = this.ctx.createGain()
    const o = this._osc('sine', 110, t, 1.6)
    o.frequency.exponentialRampToValueAtTime(30, t + 0.9)
    o.connect(g)
    this._env(t, 0.004, 1.1, 1.3, g)
    this._out(g, this.sfxBus, { send: 0.3 })
    this._burst(t, 0.9, { type: 'lowpass', f: 2500, gain: 0.8, send: 0.3 })
    ;[523, 784, 1318, 2100].forEach((f, i) => {
      const gg = this.ctx.createGain()
      const oo = this._osc('sine', f, t, 2)
      oo.connect(gg)
      this._env(t, 0.002, 0.08 / (i + 1), 1.6, gg)
      this._out(gg, this.sfxBus, { send: 0.5 })
    })
    this._dhag(t, 1.1)
  }
  _sfx_ignite(t) {
    this._burst(t, 1.6, { type: 'lowpass', f: 1400, gain: 0.5, attack: 0.5, send: 0.2 })
  }
  _sfx_fwLaunch(t, { pan = 0 } = {}) {
    const g = this.ctx.createGain()
    const o = this._osc('sine', 500, t, 0.9)
    o.frequency.exponentialRampToValueAtTime(2200, t + 0.85)
    o.connect(g)
    this._env(t, 0.05, 0.06, 0.8, g)
    this._out(g, this.sfxBus, { pan })
    this._burst(t, 0.8, { f: 2500, q: 0.6, gain: 0.08, pan })
  }
  _sfx_fwBurst(t, { pan = 0, vol = 1 } = {}) {
    this._burst(t, 0.9, { type: 'lowpass', f: 1800, gain: 0.55 * vol, pan, send: 0.4 })
    const g = this.ctx.createGain()
    const o = this._osc('sine', 95, t, 0.6)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4)
    o.connect(g)
    this._env(t, 0.003, 0.7 * vol, 0.5, g)
    this._out(g, this.sfxBus, { pan, send: 0.3 })
    for (let i = 0; i < 7; i++) this._burst(t + 0.2 + Math.random() * 0.9, 0.03, { type: 'highpass', f: 4000, gain: 0.18 * vol, pan })
  }
  _sfx_finale(t) {
    ;[0, 4, 7, 12, 16, 19, 24].forEach((semi, i) => {
      const f = hz(semi, 523.25)
      const g = this.ctx.createGain()
      const o = this._osc('triangle', f, t + i * 0.11, 2.2)
      o.connect(g)
      this._env(t + i * 0.11, 0.005, 0.18, 1.8, g)
      this._out(g, this.sfxBus, { send: 0.6 })
    })
    ;[0, 4, 7, 12].forEach((semi) => this._shehnai(hz(semi, 293.66), t + 0.8, 1.8, 0.9))
    for (let i = 0; i < 10; i++) this._tilli(t + i * 0.09, 0.8)
    this._dhag(t + 0.9, 1.1)
    this._burst(t + 0.9, 2.2, { type: 'highpass', f: 6000, gain: 0.15, attack: 0.05, send: 0.3 })
  }

  // ---- continuous fire -------------------------------------------------
  startFire() {
    if (!this.ctx || this.fire) return
    const c = this.ctx
    const n = this._src(this.brown, true)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    const g = c.createGain()
    g.gain.value = 0.0001
    n.connect(lp)
    lp.connect(g)
    g.connect(this.sfxBus)
    n.start()
    const f = { n, g, level: 0, timer: null }
    const crackle = () => {
      if (this.fire !== f) return
      if (f.level > 0.02 && !this.state.muted && this.ctx.state === 'running') {
        this._burst(this.ctx.currentTime, 0.02 + Math.random() * 0.03, {
          f: 900 + Math.random() * 3500,
          q: 1.5,
          gain: (0.1 + Math.random() * 0.35) * f.level,
          pan: Math.random() * 0.8 - 0.4,
        })
      }
      f.timer = setTimeout(crackle, 1000 / (4 + 30 * f.level) * (0.4 + Math.random()))
    }
    this.fire = f
    crackle()
  }
  setFireLevel(l) {
    if (!this.fire) return
    this.fire.level = l
    this.fire.g.gain.setTargetAtTime(0.0001 + l * 0.35, this.ctx.currentTime, 0.2)
  }
  stopFire() {
    const f = this.fire
    if (!f) return
    this.fire = null
    clearTimeout(f.timer)
    try {
      f.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2)
      f.n.stop(this.ctx.currentTime + 1)
    } catch { /* ignore */ }
  }
  level() {
    if (!this.analyser) return 0
    const d = (this._lvl ||= new Uint8Array(this.analyser.frequencyBinCount))
    this.analyser.getByteTimeDomainData(d)
    let m = 0
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i] - 128))
    return m / 128
  }
}

export const audio = new AudioManager()
if (typeof window !== 'undefined') window.__audio = audio
