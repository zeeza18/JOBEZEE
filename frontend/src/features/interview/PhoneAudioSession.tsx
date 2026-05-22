import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, MessageSquare, Clock } from 'lucide-react'
import type { GeneratedInterview } from '../../lib/api'
import type { AvatarResult } from './AvatarCanvas'

// ── Backend base URL ──────────────────────────────────────────────────────────
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

  // ── TTS ───────────────────────────────────────────────────────────────────
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
          if (pendingReplyRef.current) {
            const reply = pendingReplyRef.current; pendingReplyRef.current = null; void playTTS(reply)
          } else { setPhase('processing'); waitingRef.current = true }
        } else { startListening() }
      }
      src.start(); currentSrcRef.current = src
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'TTS failed'); setPhase('error')
    }
  }

  const FILLERS = ["Hmm, interesting.", "I see, thank you.", "Got it.", "That's helpful.", "Okay, noted."]
  const speakFiller = () => {
    isFillerRef.current = true; pendingReplyRef.current = null; waitingRef.current = false
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
          questions: interview.questions, history: historyRef.current,
          candidate_answer: '', round_type: interview.round,
        }),
      })
      if (!res.ok) throw new Error(`Chat ${res.status}`)
      const { reply } = await res.json()
      pushTurn({ role: 'interviewer', text: reply })
      startTimer()
      if (!candidateAnswer || waitingRef.current) { waitingRef.current = false; void playTTS(reply) }
      else { pendingReplyRef.current = reply }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not reach backend'); setPhase('error')
    }
  }

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

  // ── Phase badge ───────────────────────────────────────────────────────────
  const phaseBadge = {
    loading:    { label: 'Connecting…',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    speaking:   { label: 'Sophia speaking', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse' },
    processing: { label: 'Thinking…',       cls: 'bg-slate-100 text-slate-500 border-slate-200 animate-pulse' },
    listening:  { label: 'Your turn',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    muted:      { label: 'Muted',           cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    error:      { label: 'Error',           cls: 'bg-red-50 text-red-600 border-red-200' },
  }[phase]

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-40">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Sophia avatar chip */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Sophia · Phone Screen</p>
            <p className="text-xs text-slate-400 truncate max-w-xs">{interview.job_title}{interview.company !== 'Unknown' ? ` — ${interview.company}` : ''}</p>
          </div>
        </div>

        {/* Timer + phase badge */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${phaseBadge.cls}`}>
            {phaseBadge.label}
          </span>
          {callLive && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono bg-slate-100 rounded-full px-2.5 py-1">
              <Clock className="h-3 w-3" />
              {fmt(callSecs)}
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 overflow-hidden">

        {/* Sophia voice card */}
        <div className={`relative bg-white rounded-2xl border shadow-sm flex flex-col items-center gap-5 px-10 py-10 transition-all duration-300 ${
          phase === 'speaking' ? 'border-cyan-300 shadow-cyan-100 shadow-md' : 'border-slate-200'
        }`}>

          {/* Avatar circle */}
          <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
            phase === 'speaking'
              ? 'bg-gradient-to-br from-violet-100 to-cyan-50 ring-4 ring-cyan-200/60'
              : 'bg-gradient-to-br from-slate-100 to-slate-50 ring-4 ring-transparent'
          }`}>
            {phase === 'speaking' ? (
              <div className="flex items-end gap-[3px] h-10">
                {[0.4, 0.65, 0.9, 1, 0.75, 0.95, 0.6, 0.85, 0.45].map((h, i) => (
                  <div key={i}
                    className="w-[3.5px] rounded-full bg-cyan-500"
                    style={{
                      height: `${h * 36}px`,
                      animation: `phoneWave 0.8s ease-in-out ${i * 0.07}s infinite alternate`,
                    }}
                  />
                ))}
                <style>{`@keyframes phoneWave{from{transform:scaleY(.2);opacity:.5}to{transform:scaleY(1);opacity:1}}`}</style>
              </div>
            ) : (
              <svg className="w-12 h-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">Sophia</p>
            <p className="text-xs text-slate-400">AI Interviewer · Phone Screen</p>
          </div>

          {/* Listening waveform */}
          {phase === 'listening' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <div className="flex items-end gap-[3px] h-5">
                {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.5].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full bg-emerald-500"
                    style={{ height: `${h * 18}px`, animation: `phoneWave 0.85s ease-in-out ${i * 0.07}s infinite alternate` }} />
                ))}
              </div>
              <span className="text-xs font-semibold text-emerald-700">Listening — speak now</span>
            </div>
          )}

          {phase === 'muted' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <MicOff className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Muted — tap mic to answer</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 max-w-xs">
              <p className="text-xs text-red-600 text-center">{errorMsg}</p>
            </div>
          )}

          {liveText && phase !== 'speaking' && (
            <p className="text-xs text-slate-400 italic text-center max-w-xs">"{liveText}"</p>
          )}
        </div>

        {/* Transcript */}
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowTranscript(v => !v)}
            className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
              showTranscript
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {showTranscript ? 'Hide transcript' : `Show transcript${history.length > 0 ? ` (${history.length} turns)` : ''}`}
          </button>

          {showTranscript && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl p-4 max-h-52 overflow-y-auto space-y-3 shadow-sm">
              {history.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">Conversation will appear here…</p>
              )}
              {history.map((turn, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${turn.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-400 font-medium px-1">
                    {turn.role === 'candidate' ? 'You' : 'Sophia'} · {turn.time}
                  </span>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                    turn.role === 'candidate'
                      ? 'bg-cyan-50 text-cyan-900 border border-cyan-100'
                      : 'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}>
                    {turn.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom controls ──────────────────────────────────────────────── */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-center gap-4 shrink-0">

        {/* Mute */}
        <button
          onClick={toggleMic}
          title={micMuted ? 'Unmute' : 'Mute'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border font-medium ${
            micMuted
              ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
          }`}
        >
          {micMuted ? <MicOff className="h-4.5 w-4.5 h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
        </button>

        {/* End call */}
        <button
          onClick={() => setShowEnd(true)}
          className="flex items-center gap-2 h-12 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </button>
      </div>

      {/* ── End confirmation ─────────────────────────────────────────────── */}
      {showEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-80 overflow-hidden">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-slate-900">End phone screen?</p>
              <p className="text-xs text-slate-400 mt-1">Your session will be saved to your history.</p>
            </div>
            <div className="px-6 pb-5 flex flex-col gap-2">
              <button
                onClick={() => doEnd(true)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors"
              >
                Save &amp; Exit
              </button>
              <button
                onClick={() => setShowEnd(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors"
              >
                Continue Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
