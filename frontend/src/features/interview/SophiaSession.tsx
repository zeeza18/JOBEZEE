import AvatarCanvas, { type AvatarResult } from './AvatarCanvas'
import { PhoneAudioSession } from './PhoneAudioSession'
import type { GeneratedInterview } from '../../lib/api'

interface Props {
  interview: GeneratedInterview
  onFinish:  (r: AvatarResult) => void
  onExit:    () => void
}

/**
 * Routes to:
 *   Phone Screen round → PhoneAudioSession (audio-only, no avatar)
 *   All other rounds   → AvatarCanvas (Sophia 3D avatar with lip-sync)
 */
export function SophiaSession({ interview, onFinish, onExit }: Props) {
  if (interview.round === 'phone') {
    return (
      <PhoneAudioSession
        interview={interview}
        onFinish={onFinish}
        onExit={onExit}
      />
    )
  }

  return (
    <AvatarCanvas
      interview={interview}
      onFinish={onFinish}
      onExit={onExit}
    />
  )
}
