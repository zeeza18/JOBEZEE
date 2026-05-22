import { useEffect, useRef, useState } from 'react'
import type { GeneratedInterview } from '../../lib/api'
import type { AvatarResult } from './AvatarCanvas'

// ── Backend base URL ───────────────────────────────────────────────────────────
const _HOST   = window.location.hostname
const _IS_LOC = _HOST === 'localhost' || _HOST === '127.0.0.1'
const _ENV    = (import.meta.env.VITE_API_URL || '').trim()
const _FIRST  = _IS_LOC || _HOST.endsWith('jobezee.org') || _HOST.endsWith('vercel.app')
const BASE    = (_IS_LOC && _ENV.includes('localhost')) ? _ENV : (_FIRST ? '' : _ENV)

type Phase = 'loading' | 'speaking' | 'listening' | 'processing' | 'error' | 'muted'
interface Turn { role: 'interviewer' | 'candidate'; text: string; time: string }

const nowStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const fmt    = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

interface Props {
  interview: GeneratedInterview
  onFinish:  (r: AvatarResult) => void
  onExit:    () => void
}

export function PhoneAudioSession({ interview, onFinish, onExit }: Props) {
  const historyRef      = useRef<Turn[]>([])
  const recorderRef     = useRef<MediaRecorder | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const currentSrcRef   = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef    = useRef(Date.now())
  const micMutedRef     = useRef(false)
  const transcriptRef   = useRef<HTMLDivElement>(null)
  const isFillerRef     = useRef(false)
  const pendingReplyRef = useRef<string | null>(null)
  const waitingRef      = useRef(false)

  const [phase,          setPhase]          = useState<Phase>('loading')
  const [history,        setHistory]        = useState<Turn[]>([])
  const [liveText,       setLiveText]       = useState('')
  const [micMuted,       setMicMuted]       = useState(false)
  const [callSecs,       setCallSecs]       = useState(0)
  const [callLive,       setCallLive]       = useState(false)
  const [showEnd,        setShowEnd]        = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [errorMsg,       setErrorMsg]       = useState('')

  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current)
    currentSrcRef.current?.stop()
    audioCtxRef.current?.close()
  }, [])

  useEffect(() => { transcriptRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  const startTimer = () => {
    if (timerRef.current) return
    setCallLive(true)
    timerRef.current = setInterval(() => setCallSecs(s => s + 1), 1000)
  }

  const pushTurn = (turn: Omit<Turn, 'time'>) => {
    const t: Turn = { ...turn, time: nowStr() }
    historyRef.current = [...historyRef.current, t]
    setHistory([...historyRef.current])
  }

  // ── TTS via Web Audio API ──────────────────────────────────────────────────
  const playTTS = async (text: string) => {
    setPhase('speaking')
    try {
      const res = await fetch(`${BASE}/api/avatar/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text }, voice: { speaker: 'sophia' }, audioConfig: {} }),
      })
      if (!res.ok) throw new Error(`TTS ${res.status}`)
      const { audioContent } = await res.json()
      if (!audioContent) { setPhase('listening'); startListening(); return }

      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const bin = atob(audioContent)
      const raw = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i)
      const buf = await ctx.decodeAudioData(raw.buffer)

      currentSrcRef.current?.stop()
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.onended = () => {
        if (isFillerRef.current) {
          isFillerRef.current = false
          if (pendingReplyRef.current) { const r = pendingReplyRef.current; pendingReplyRef.current = null; void playTTS(r) }
          else { setPhase('processing'); waitingRef.current = true }
        } else { startListening() }
      }
      src.start()
      currentSrcRef.current = src
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'TTS failed')
      setPhase('error')
    }
  }

  const FILLERS = ["Hmm, interesting.", "I see, thank you.", "Got it.", "That's helpful.", "Okay, noted."]
  const speakFiller = () => {
    isFillerRef.current = true
    pendingReplyRef.current = null
    waitingRef.current = false
    void playTTS(FILLERS[Math.floor(Math.random() * FILLERS.length)])
  }

  // ── STT ───────────────────────────────────────────────────────────────────
  const startListening = async () => {
    if (micMutedRef.current) { setPhase('muted'); return }
    setPhase('listening'); setLiveText('')

    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { setErrorMsg('Microphone access denied.'); setPhase('error'); return }

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser(); analyser.fftSize = 512
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const pcm = new Float32Array(analyser.fftSize)

    const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m)) ?? ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); audioCtx.close()
      await submitAudio(new Blob(chunks, { type: mimeType || 'audio/webm' }))
    }
    recorderRef.current = recorder; recorder.start(100)

    const THRESH = 0.009, MIN_SPEECH = 500, SILENCE_GAP = 1500, MAX_REC = 45_000
    let hasSpeech = false, speechStart = 0, silenceStart = Date.now()
    const recStart = Date.now()

    const tick = () => {
      if (recorder.state !== 'recording') return
      analyser.getFloatTimeDomainData(pcm)
      let rms = 0; for (let j = 0; j < pcm.length; j++) rms += pcm[j]*pcm[j]; rms = Math.sqrt(rms/pcm.length)
      const now = Date.now()
      if (rms > THRESH) { if (!hasSpeech) { hasSpeech = true; speechStart = now } silenceStart = now }
      if ((hasSpeech && now - speechStart > MIN_SPEECH && now - silenceStart > SILENCE_GAP) || now - recStart > MAX_REC)
        { recorder.stop(); return }
      setTimeout(tick, 80)
    }
    setTimeout(tick, 80)
  }

  const submitAudio = async (blob: Blob) => {
    setPhase('processing')
    try {
      const form = new FormData(); form.append('audio', blob, 'recording.webm')
      const res = await fetch(`${BASE}/api/avatar/stt`, { method: 'POST', credentials: 'include', body: form })
      if (!res.ok) throw new Error(`STT ${res.status}`)
      const { transcript } = await res.json()
      if (transcript.trim()) { setLiveText(transcript); void fetchNext(transcript) }
      else startListening()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'STT failed'); setPhase('error')
    }
  }

  const fetchNext = async (candidateAnswer: string) => {
    setPhase('processing')
    if (candidateAnswer) { pushTurn({ role: 'candidate', text: candidateAnswer }); speakFiller() }
    try {
      const res = await fetch(`${BASE}/api/avatar/chat`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: interview.questions,
          history: historyRef.current,
          candidate_answer: '',
          round_type: interview.round,
        }),
      })
      if (!res.ok) throw new Error(`Chat ${res.status}`)
      const { reply } = await res.json()
      pushTurn({ role: 'interviewer', text: reply })
      startTimer()
      if (!candidateAnswer || waitingRef.current) {
        waitingRef.current = false; void playTTS(reply)
      } else {
        pendingReplyRef.current = reply
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not reach backend'); setPhase('error')
    }
  }

  // Start the interview on mount
  useEffect(() => { void fetchNext('') }, [])

  const buildResult = (): AvatarResult => ({
    interview,
    answers: historyRef.current.filter(t => t.role === 'candidate').map(t => t.text),
    elapsed_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
    completed_at: new Date().toISOString(),
  })

  const doEnd = (save: boolean) => {
    timerRef.current && clearInterval(timerRef.current)
    try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() } catch {}
    currentSrcRef.current?.stop()
    if (save) onFinish(buildResult()); else onExit()
  }

  const toggleMic = () => {
    const m = !micMuted; setMicMuted(m); micMutedRef.current = m
    if (!m && phase === 'muted') startListening()
  }

  return (
    <div className="fixed inset-0 bg-[#0d0f1a] flex flex-col items-center justify-center gap-0 z-40">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <p className="text-white/90 font-semibold text-sm">Sophia · Phone Screen</p>
            <p className="text-white/40 text-xs">{interview.job_title} — {interview.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {callLive && (
            <div className="flex items-center gap-1.5 text-white/50 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {fmt(callSecs)}
            </div>
          )}
        </div>
      </div>

      {/* Center — audio visual */}
      <div className="flex flex-col items-center gap-8 mt-16">

        {/* Sophia avatar placeholder with voice ring */}
        <div className="relative">
          <div className={`absolute inset-0 rounded-full transition-all duration-300 ${phase === 'speaking' ? 'ring-[6px] ring-violet-500/40 scale-110' : ''}`} />
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border-2 flex items-center justify-center transition-all duration-300 ${
            phase === 'speaking' ? 'border-violet-400/60' : 'border-white/10'
          }`}>
            {/* Waveform bars when speaking */}
            {phase === 'speaking' ? (
              <div className="flex items-center gap-[4px]">
                {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.8, 0.5].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full bg-violet-400"
                    style={{ height: `${h * 32}px`, animation: `waveBar 0.85s ease-in-out ${i * 0.08}s infinite alternate` }} />
                ))}
                <style>{`@keyframes waveBar{from{transform:scaleY(.2)}to{transform:scaleY(1)}}`}</style>
              </div>
            ) : (
              <svg className="w-12 h-12 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#1a1a30] border border-white/10 rounded-full px-3 py-0.5 text-[11px] text-white/60 font-medium whitespace-nowrap">
            Sophia
          </div>
        </div>

        {/* Status */}
        <div className="text-center min-h-[48px] flex flex-col items-center justify-center gap-1">
          {phase === 'loading'    && <p className="text-white/40 text-sm">Connecting…</p>}
          {phase === 'speaking'   && <p className="text-violet-300/80 text-sm font-medium animate-pulse">Sophia is speaking…</p>}
          {phase === 'processing' && <p className="text-white/40 text-sm animate-pulse">Thinking…</p>}
          {phase === 'listening'  && (
            <>
              <p className="text-cyan-300/80 text-sm font-medium">Your turn — speak now</p>
              {liveText && <p className="text-white/40 text-xs italic max-w-xs text-center">"{liveText}"</p>}
            </>
          )}
          {phase === 'muted'      && <p className="text-yellow-300/70 text-sm">You're muted — tap mic to unmute</p>}
          {phase === 'error'      && <p className="text-red-400/80 text-sm">{errorMsg}</p>}
        </div>

        {/* Transcript toggle */}
        <button onClick={() => setShowTranscript(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-colors ${
            showTranscript ? 'border-blue-500/30 bg-blue-500/10 text-blue-300/80' : 'border-white/10 bg-white/5 text-white/40 hover:text-white/60'
          }`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>

        {/* Inline transcript */}
        {showTranscript && (
          <div className="w-full max-w-sm max-h-48 overflow-y-auto space-y-2 border border-white/8 rounded-xl p-3 bg-white/[0.03]">
            {history.length === 0 && <p className="text-white/20 text-xs text-center py-2">Conversation will appear here…</p>}
            {history.map((turn, i) => (
              <div key={i} className={`flex flex-col gap-0.5 ${turn.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                <span className="text-white/25 text-[10px]">{turn.role === 'candidate' ? 'You' : 'Sophia'}</span>
                <div className={`max-w-[85%] px-3 py-1.5 rounded-lg text-[12px] leading-relaxed ${
                  turn.role === 'candidate' ? 'bg-blue-500/15 text-blue-100/70' : 'bg-white/[0.06] text-white/60'
                }`}>{turn.text}</div>
              </div>
            ))}
            <div ref={transcriptRef} />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-6 py-5 border-t border-white/8">
        {/* Mute */}
        <button onClick={toggleMic} title={micMuted ? 'Unmute' : 'Mute'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border text-sm ${
            micMuted ? 'bg-red-500/80 border-red-500/40 text-white' : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/18'
          }`}>
          {micMuted ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2M19 12a7 7 0 0 1-.11 1.23"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          )}
        </button>

        {/* End call */}
        <button onClick={() => setShowEnd(true)}
          className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm shadow-[0_0_18px_rgba(220,38,38,0.45)] transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.72 19.72 0 0 1-3.07-8.67A2 2 0 0 1 3.34 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.3 10.9"/>
            <line x1="23" y1="1" x2="1" y2="23"/>
          </svg>
          End Call
        </button>
      </div>

      {/* End confirmation modal */}
      {showEnd && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d20] border border-white/10 rounded-2xl shadow-2xl w-72 p-5 flex flex-col gap-4">
            <div>
              <p className="text-white/90 font-semibold text-sm">End phone screen?</p>
              <p className="text-white/40 text-xs mt-1">Your session will be saved to history.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => doEnd(true)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                Save &amp; Exit
              </button>
              <button onClick={() => setShowEnd(false)}
                className="w-full py-2 text-white/35 hover:text-white/60 text-sm transition-colors">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
