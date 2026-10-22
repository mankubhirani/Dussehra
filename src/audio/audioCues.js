import { audio } from './AudioManager'

// Maps timeline events to audio cues.
export function bindAudioToDirector(director) {
  const timers = new Set()
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
  }
  const off = director.on(async (e) => {
    switch (e.type) {
      case 'start':
        await audio.unlock()
        if (!audio.state.muted && !audio.state.musicOn) audio.setMusic(true)
        audio.setIntensity(0.5)
        break
      case 'pause':
        audio.suspend()
        break
      case 'resume':
        audio.resume()
        break
      case 'reset':
        timers.forEach(clearTimeout)
        timers.clear()
        audio.reset()
        audio.resume()
        break
      case 'finish':
        if (e.skipped) audio.play('finale')
        audio.setIntensity(2)
        break
      case 'stage': {
        if (e.skipped) return
        switch (e.id) {
          case 'intro': later(() => audio.play('conch'), 500); break
          case 'reveal': audio.setIntensity(1); break
          case 'prepare': audio.setIntensity(1); audio.play('bowDraw'); break
          case 'release':
            audio.setIntensity(0)
            audio.play('bowRelease')
            audio.play('whoosh', { dur: 2.5 })
            break
          case 'impact': audio.play('impact'); break
          case 'ignition':
            audio.play('ignite')
            audio.startFire()
            audio.setIntensity(2)
            break
          case 'burning': audio.setIntensity(2); break
          case 'fireworks': audio.setIntensity(3); break
          case 'celebration': audio.play('finale'); audio.setIntensity(2); break
          default: break
        }
        break
      }
      default: break
    }
  })
  return () => {
    off()
    timers.forEach(clearTimeout)
  }
}
