import { useState } from 'react'
import { shareWish, WISHES } from '../utils/share'
import { toast } from './Toast'

const HEADS = [
  ['Kama', 'काम', 'Desire'], ['Krodha', 'क्रोध', 'Anger'], ['Lobha', 'लोभ', 'Greed'], ['Moha', 'मोह', 'Delusion'], ['Mada', 'मद', 'Pride'],
  ['Matsarya', 'मत्सर', 'Envy'], ['Manas', 'मन', 'Restless mind'], ['Buddhi', 'बुद्धि', 'Intellect without humility'], ['Chitta', 'चित्त', 'Clinging memory & will'], ['Ahamkara', 'अहंकार', 'Ego'],
]

const STORY = [
  ['Exile', 'वनवास', 'Prince Rama, bound by his father’s word, walks into fourteen years of exile in the forest with Sita and Lakshmana.'],
  ['The abduction', 'हरण', 'Ravana, the learned but arrogant king of Lanka, carries Sita away — a choice driven by pride, not wisdom.'],
  ['Hanuman’s leap', 'सेतु', 'With Hanuman’s devotion and an army of vanaras, a bridge is raised across the sea to Lanka.'],
  ['The ten-day war', 'युद्ध', 'The war stretches over many days. On the tenth, Rama’s arrow brings Ravana’s reign to an end.'],
  ['Return of light', 'दीपावली', 'Twenty days later, Rama returns to Ayodhya; the city lights lamps to welcome him — the story that Diwali remembers.'],
]

const TILES = [
  ['🪔', 'Diyas of dusk', 'linear-gradient(160deg,#42200a,#c2570c)'],
  ['🏹', 'The divine bow', 'linear-gradient(160deg,#10183f,#3a4fb3)'],
  ['🎆', 'Skies in colour', 'linear-gradient(160deg,#1b0933,#a02a72)'],
  ['🌼', 'Marigold garlands', 'linear-gradient(160deg,#4a2c00,#e8a317)'],
  ['🎭', 'Ramlila stage', 'linear-gradient(160deg,#3a0b12,#c23a3a)'],
  ['🐚', 'Conch at dawn', 'linear-gradient(160deg,#0c2a33,#2c8fa0)'],
  ['🔥', 'Ravan Dahan', 'linear-gradient(160deg,#2b0a05,#e24b10)'],
  ['🍬', 'Sweets shared', 'linear-gradient(160deg,#2a1a08,#cf7f2c)'],
]

const PLACES = [
  ['Ramlila & effigies — North India', 'Neighbourhood Ramlila performances end on Dussehra evening with towering effigies of Ravana, Meghnad and Kumbhakarna set alight.'],
  ['Mysuru Dasara — Karnataka', 'A ten-day royal festival with illuminated palace and a grand procession on Vijayadashami.'],
  ['Kullu Dussehra — Himachal', 'Begins as Dussehra ends elsewhere: hundreds of village deities gather in a week-long festival.'],
  ['Durga Puja & Vijayadashami — Bengal & East', 'Devotees bid farewell to Goddess Durga, celebrating her victory over Mahishasura.'],
]

function Section({ id, kicker, title, children, alt }) {
  return (
    <section className={`section${alt ? ' alt' : ''}`} id={id} aria-labelledby={`${id}-t`}>
      <div className="wrap">
        <p className="kicker">{kicker}</p>
        <h2 id={`${id}-t`}>{title}</h2>
        {children}
      </div>
    </section>
  )
}

export function Story() {
  return (
    <Section id="story" kicker="रामायण · The Ramayana" title="How the story unfolds">
      <ol className="timeline">
        {STORY.map(([t, hi, p], i) => (
          <li key={t}>
            <span className="timeline-n" aria-hidden="true">{i + 1}</span>
            <div>
              <h3>{t} <span lang="hi">· {hi}</span></h3>
              <p>{p}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function Significance() {
  return (
    <Section id="significance" kicker="महत्व · Why we celebrate" title="Spiritual significance" alt>
      <div className="two-col">
        <p className="lead">
          Dussehra, or Vijayadashami, falls on the tenth day of the bright half of Ashwin. It reminds us that dharma — truth, duty and compassion —
          outlasts adharma, however mighty it seems. Burning Ravana’s effigy is not about hatred of a person; it is a public act of burning what is
          within us that stands against the light.
        </p>
        <blockquote>
          “धर्म की जय हो, अधर्म का नाश हो.”
          <cite>A traditional invocation</cite>
        </blockquote>
      </div>
      <h3 className="sub">The ten heads: ten inner adversaries</h3>
      <p className="muted">A common reading treats each head as a tendency to overcome — which is why a learned scholar of ten heads still falls.</p>
      <ul className="heads">
        {HEADS.map(([en, hi, d], i) => (
          <li key={en}>
            <span className="heads-n" aria-hidden="true">{i + 1}</span>
            <b>{en}</b> <span lang="hi">{hi}</span>
            <small>{d}</small>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function Gallery() {
  return (
    <Section id="gallery" kicker="झाँकी · Festival gallery" title="Moments of the festival">
      <ul className="gallery">
        {TILES.map(([emoji, cap, bg]) => (
          <li key={cap} style={{ background: bg }}>
            <span className="gallery-emoji" aria-hidden="true">{emoji}</span>
            <span className="gallery-cap">{cap}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Illustrated tiles — no photographs are bundled with this project.</p>
    </Section>
  )
}

export function Celebrations() {
  const [last, setLast] = useState(-1)
  const send = async (i) => {
    const r = await shareWish(WISHES[i])
    setLast(i)
    toast({ copied: 'Wishes copied to clipboard 🪔', shared: 'Thanks for sharing the light!', failed: 'Could not copy — select the text and copy it manually.' }[r] || '')
  }
  return (
    <Section id="celebrations" kicker="उत्सव · Celebrations" title="Celebrations & wishes" alt>
      <div className="cards">
        {PLACES.map(([t, p]) => (
          <article key={t} className="card">
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </div>
      <h3 className="sub">Dussehra wishes</h3>
      <div className="wishes">
        {WISHES.map((w, i) => (
          <figure key={i} className="wish">
            <blockquote>
              <p lang="hi">{w.hi}</p>
              <p>{w.en}</p>
            </blockquote>
            <button className="btn btn-sm" onClick={() => send(i)}>{last === i ? '✓ Shared' : 'Share Wishes'}</button>
          </figure>
        ))}
      </div>
    </Section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer-hi" lang="hi">विजयादशमी की हार्दिक शुभकामनाएँ — जय श्री राम 🪔</p>
      <p>Happy Dussehra. May light always win.</p>
      <p className="small muted">Dussehra V4 · built with React, Three.js &amp; Web Audio. All visuals and sounds are generated in your browser.</p>
    </footer>
  )
}
