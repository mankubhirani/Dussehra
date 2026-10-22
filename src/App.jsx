import { useEffect } from 'react'
import { director } from './animation/DahanTimeline'
import { bindAudioToDirector } from './audio/audioCues'
import { audio } from './audio/AudioManager'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import Toast from './components/Toast'
import { Story, Significance, Gallery, Celebrations, Footer } from './components/Sections'

export default function App() {
  useEffect(() => {
    const off = bindAudioToDirector(director)
    // pause the sequence (and its audio) while the tab is hidden
    const vis = () => {
      if (document.hidden) director.pause('hidden')
      else director.resume('hidden')
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      off()
      document.removeEventListener('visibilitychange', vis)
      audio.dispose()
    }
  }, [])

  return (
    <>
      <a className="skip" href="#story">Skip to content</a>
      <Header />
      <main>
        <HeroSection />
        <Story />
        <Significance />
        <Gallery />
        <Celebrations />
      </main>
      <Footer />
      <Toast />
    </>
  )
}
