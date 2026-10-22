import { useDahan } from '../hooks/useSceneControls'
import { STAGES } from '../animation/DahanTimeline'
import { director } from '../animation/DahanTimeline'

export default function ProgressIndicator() {
  const d = useDahan()
  if (!d || d.stageIndex < 0) return null
  const st = STAGES[d.stageIndex]
  const finished = d.mode === 'finished'
  return (
    <div className="progress" role="group" aria-label="Ravan Dahan sequence progress">
      <div className="progress-head">
        <span className="progress-step" aria-live="polite">
          <b>{st.en}</b> <span lang="hi">· {st.hi}</span>
        </span>
        <span className="progress-count">{Math.min(d.stageIndex + 1, STAGES.length)} / {STAGES.length}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Sequence progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(d.progress * 100)}>
        <span style={{ width: `${d.progress * 100}%` }} />
        <ol className="progress-ticks" aria-hidden="true">
          {STAGES.map((s, i) => (
            <li key={s.id} data-on={i <= d.stageIndex} />
          ))}
        </ol>
      </div>
      <div className="progress-actions">
        {!finished && (
          <button className="btn btn-sm" onClick={() => director.togglePause()} aria-pressed={d.paused}>
            {d.paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
        )}
        {!finished && <button className="btn btn-sm" onClick={() => director.skip()}>Skip cinematic ⏭</button>}
        <button className="btn btn-sm" onClick={() => director.replay()}>↻ Replay</button>
        <button className="btn btn-sm btn-ghost" onClick={() => director.reset()}>Reset</button>
      </div>
    </div>
  )
}
