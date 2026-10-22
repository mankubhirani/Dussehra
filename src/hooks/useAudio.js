import { useSyncExternalStore } from 'react'
import { audio } from '../audio/AudioManager'

export const useAudio = () => useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getSnapshot)
