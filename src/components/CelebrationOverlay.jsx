import { useDahan } from '../hooks/useSceneControls'
import { director } from '../animation/DahanTimeline'
import { shareWish, WISHES } from '../utils/share'
import { toast } from './Toast'

const MSG = { copied: 'Wishes copied to clipboard 🪔', shared: 'Thanks for sharing the light!', failed: 'Could not copy — please select the text manually.' }

export default function CelebrationOverlay() {
  const d = useDahan()
  if (!d || d.stageId !== 'celebration') return null
  const share = async () => {
    const r = await shareWish(WISHES[1])
    if (MSG[r]) toast(MSG[r])
  }
  return (
    <div className="celebrate" role="status">
      <p className="celebrate-kicker">विजयादशमी · Vijayadashami</p>
      <h2 className="celebrate-hi" lang="hi" aria-label="बुराई पर अच्छाई की विजय">
        {'बुराई पर अच्छाई की विजय'.split(' ').map((w, i) => (
          <span key={i} style={{ animationDelay: `${0.25 + i * 0.35}s` }}>{w}</span>
        ))}
      </h2>
      <p className="celebrate-en">The victory of good over evil — Happy Dussehra!</p>
      <div className="celebrate-actions">
        <button className="btn btn-primary" onClick={share}>Share Wishes</button>
        <button className="btn" onClick={() => director.replay()}>↻ Replay</button>
        <button className="btn btn-ghost" onClick={() => director.reset()}>Reset</button>
      </div>
    </div>
  )
}
