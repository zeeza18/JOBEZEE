'use client'

import { useEffect, useRef, useState } from 'react'
import type { GeneratedInterview, InterviewQuestion } from '../../lib/api'
import CodingPanel, { type TestResult } from './CodingPanel'

// ── Backend base URL (mirrors api.ts logic) ────────────────────────────────
const _HOST    = typeof window !== 'undefined' ? window.location.hostname : ''
const _IS_LOC  = _HOST === 'localhost' || _HOST === '127.0.0.1'
const _ENV_API = (import.meta.env.VITE_API_URL || '').trim()
const _FIRST   = _IS_LOC || _HOST.endsWith('jobezee.org') || _HOST.endsWith('vercel.app')
const BASE     = (_IS_LOC && _ENV_API.includes('localhost')) ? _ENV_API : (_FIRST ? '' : _ENV_API)

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase    = 'loading' | 'speaking' | 'listening' | 'processing' | 'error' | 'muted'
type ViewMode = 'spotlight' | 'sideBySide' | 'youFocused'
interface Turn { role: 'interviewer' | 'candidate'; text: string; time: string }

export interface AvatarResult {
  interview:      GeneratedInterview
  answers:        string[]   // candidate turns extracted from transcript
  elapsed_seconds: number
  completed_at:   string
}

interface Props {
  interview:  GeneratedInterview
  onFinish:   (r: AvatarResult) => void
  onExit:     () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AVATAR_URL = '/avatars/sophia/sophia.glb'
const SPEAKER    = 'sophia' as const

const VIEW_LABELS: Record<ViewMode, string> = {
  spotlight:  'Spotlight',
  sideBySide: 'Side by side',
  youFocused: 'You in focus',
}

const fmt    = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
const nowStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// ── Tiny icons (inline SVG) ───────────────────────────────────────────────────
const Icon = {
  Mic: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  ),
  MicOff: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2M19 12a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  ),
  Cam: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  CamOff: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"/><path d="M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/>
    </svg>
  ),
  Grid: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  Chat: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Gear: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  PhoneOff: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.72 19.72 0 0 1-3.07-8.67A2 2 0 0 1 3.34 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.3 10.9"/>
      <line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
  ),
  CC: () => (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M8 12H6.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H8"/>
      <path d="M15 12h-1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H15"/>
    </svg>
  ),
}

// ── Waveform ──────────────────────────────────────────────────────────────────
function Waveform() {
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 20 }}>
      {[0.4, 0.7, 1, 0.7, 0.5, 0.8, 1, 0.6, 0.4].map((base, i) => (
        <div key={i} className="w-[3px] rounded-full bg-red-400"
          style={{ height: `${base * 18}px`, animation: `waveBar 0.9s ease-in-out ${i * 0.07}s infinite alternate` }} />
      ))}
      <style>{`@keyframes waveBar{from{transform:scaleY(.25);opacity:.5}to{transform:scaleY(1);opacity:1}}`}</style>
    </div>
  )
}

// ── Control button ────────────────────────────────────────────────────────────
function CtrlBtn({ onClick, title, active = false, danger = false, wide = false, children }: {
  onClick: () => void; title: string; active?: boolean; danger?: boolean; wide?: boolean; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className={`flex items-center justify-center gap-2 transition-all duration-200 font-medium text-sm select-none
        ${wide ? 'h-11 px-5 rounded-2xl' : 'w-11 h-11 rounded-full'}
        ${danger ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_18px_rgba(220,38,38,0.45)]'
          : active ? 'bg-red-500/80 hover:bg-red-500 text-white'
          : 'bg-white/10 hover:bg-white/18 text-white/75 hover:text-white border border-white/5'}`}
    >{children}</button>
  )
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ children, color, pulse }: { children: React.ReactNode; color: 'gray'|'blue'|'yellow'|'red'; pulse?: boolean }) {
  const c = { gray:'bg-white/8 text-white/35 border-white/8', blue:'bg-blue-500/15 text-blue-300/80 border-blue-500/20', yellow:'bg-yellow-500/15 text-yellow-300/80 border-yellow-500/20', red:'bg-red-500/15 text-red-300/80 border-red-500/20' }
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border backdrop-blur-sm ${c[color]} ${pulse?'animate-pulse':''}`}>{children}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AvatarCanvas({ interview, onFinish, onExit }: Props) {
  const iframeRef        = useRef<HTMLIFrameElement>(null)
  const cameraRef        = useRef<HTMLVideoElement>(null)
  const historyRef       = useRef<Turn[]>([])
  const recorderRef      = useRef<MediaRecorder | null>(null)
  const camStreamRef     = useRef<MediaStream | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const startTimeRef     = useRef(Date.now())
  const micMutedRef      = useRef(false)
  const isFillerRef      = useRef(false)
  const pendingReplyRef  = useRef<string | null>(null)
  const waitingRef       = useRef(false)

  const [phase,          setPhase]          = useState<Phase>('loading')
  const [errorMsg,       setErrorMsg]       = useState('')
  const [history,        setHistory]        = useState<Turn[]>([])
  const [liveText,       setLiveText]       = useState('')
  const [micMuted,       setMicMuted]       = useState(false)
  const [camOn,          setCamOn]          = useState(false)
  const [camDenied,      setCamDenied]      = useState(false)
  const [viewMode,       setViewMode]       = useState<ViewMode>('spotlight')
  const [viewToast,      setViewToast]      = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSettings,   setShowSettings]   = useState(false)
  const [showEndModal,   setShowEndModal]   = useState(false)
  const [callSecs,       setCallSecs]       = useState(0)
  const [callLive,       setCallLive]       = useState(false)

  // ── Coding challenge state ─────────────────────────────────────────────────
  const [codingActive,  setCodingActive]  = useState(false)
  const [sophiaHint,    setSophiaHint]    = useState<string | null>(null)
  const codingSubmittedRef = useRef(false)

  // ── Video / captions state ─────────────────────────────────────────────────
  const [camFullscreen, setCamFullscreen] = useState(false)
  const [showCaptions,  setShowCaptions]  = useState(true)

  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current)
    camStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

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

  const toggleCamera = async () => {
    if (camOn) {
      camStreamRef.current?.getTracks().forEach(t => t.stop())
      camStreamRef.current = null
      if (cameraRef.current) cameraRef.current.srcObject = null
      setCamOn(false); setCamFullscreen(false)
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        camStreamRef.current = s
        if (cameraRef.current) cameraRef.current.srcObject = s
        setCamOn(true); setCamDenied(false); setCamFullscreen(true)
      } catch { setCamDenied(true) }
    }
  }

  const toggleMic = () => {
    const m = !micMuted
    setMicMuted(m); micMutedRef.current = m
    if (m) {
      // Stop any active recording immediately when muting
      try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() } catch {}
    } else if (phase === 'muted') {
      startListening()
    }
  }

  const cycleView = () => {
    setViewMode(v => {
      const next: ViewMode = v === 'spotlight' ? 'sideBySide' : v === 'sideBySide' ? 'youFocused' : 'spotlight'
      setViewToast(VIEW_LABELS[next])
      setTimeout(() => setViewToast(''), 1800)
      return next
    })
  }

  // ── Coding helpers ────────────────────────────────────────────────────────
  const currentCodingQuestion = (): InterviewQuestion | null => {
    const iTurns = historyRef.current.filter(t => t.role === 'interviewer').length
    const idx    = Math.max(0, iTurns - 1)
    const q      = interview.questions[idx] as InterviewQuestion | undefined
    return (q?.category === 'coding' && q?.coding_challenge) ? q : null
  }

  const handleCodeSubmit = (code: string, results: TestResult[]) => {
    void code
    codingSubmittedRef.current = true
    setCodingActive(false)
    setSophiaHint(null)
    const passed  = results.filter(r => r.passed).length
    const detail  = passed === 3 ? 'All tests passed.' : passed === 2 ? 'One test failed.' : passed === 1 ? 'Two tests failed.' : 'All tests failed.'
    const summary = `[CODE SUBMITTED] ${passed}/3 test cases passed. ${detail}`
    fetchNext(summary)
    setTimeout(() => { codingSubmittedRef.current = false }, 800)
  }

  const handleHintRequest = async (code: string, hintIdx: number) => {
    const q = currentCodingQuestion()
    if (!q?.coding_challenge) return
    const hints = q.coding_challenge.hints || []
    if (hintIdx >= hints.length) return
    try {
      const res = await fetch(`${BASE}/api/avatar/coding-hint`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem:      q.coding_challenge.problem,
          current_code: code,
          hints,
          hint_index:   hintIdx,
        }),
      })
      if (res.ok) {
        const { hint } = await res.json()
        setSophiaHint(hint)
        setTimeout(() => setSophiaHint(null), 9000)
      }
    } catch { /* silent */ }
  }

  const buildResult = (): AvatarResult => ({
    interview,
    answers: historyRef.current.filter(t => t.role === 'candidate').map(t => t.text),
    elapsed_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
    completed_at: new Date().toISOString(),
  })

  const doEndCall = (save: boolean) => {
    timerRef.current && clearInterval(timerRef.current)
    try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop() } catch {}
    camStreamRef.current?.getTracks().forEach(t => t.stop())
    if (save) onFinish(buildResult())
    else onExit()
  }

  const downloadTranscript = () => {
    const lines = historyRef.current.map(t =>
      `[${t.time}] ${t.role === 'interviewer' ? 'Sophia' : 'You'}: ${t.text}`
    )
    const blob = new Blob([`Interview Transcript\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = `interview-${new Date().toISOString().slice(0,10)}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Speak (postMessage to iframe) ─────────────────────────────────────────
  const speakText = (text: string) => {
    setPhase('speaking')
    iframeRef.current?.contentWindow?.postMessage({ type: 'speak', text, speaker: SPEAKER }, '*')
  }

  const FILLERS = ["Hmm, interesting.", "I see, thank you.", "Got it.", "That's helpful context.", "Okay, noted."]
  const speakFiller = () => {
    isFillerRef.current = true
    pendingReplyRef.current = null
    waitingRef.current = false
    speakText(FILLERS[Math.floor(Math.random() * FILLERS.length)])
  }

  // ── Listen ────────────────────────────────────────────────────────────────
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
    let skipped = false
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); audioCtx.close()
      if (micMutedRef.current) { setPhase('muted'); return }
      if (skipped) { fetchNext(''); return }
      await submitAudio(new Blob(chunks, { type: mimeType || 'audio/webm' }))
    }
    recorderRef.current = recorder; recorder.start(100)

    const THRESH = 0.009, MIN_SPEECH = 500, SILENCE_GAP = 1500, MAX_REC = 45_000, NO_SPEECH_TIMEOUT = 4000
    let hasSpeech = false, speechStart = 0, silenceStart = Date.now()
    const recStart = Date.now()

    const tick = () => {
      if (recorder.state !== 'recording') return
      analyser.getFloatTimeDomainData(pcm)
      let rms = 0; for (let j = 0; j < pcm.length; j++) rms += pcm[j]*pcm[j]; rms = Math.sqrt(rms/pcm.length)
      const now = Date.now()
      if (rms > THRESH) { if (!hasSpeech) { hasSpeech = true; speechStart = now } silenceStart = now }
      if (!hasSpeech && now - recStart > NO_SPEECH_TIMEOUT) { skipped = true; recorder.stop(); return }
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
      if (transcript.trim()) { setLiveText(transcript); fetchNext(transcript) }
      else startListening()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'STT failed')
      setPhase('error')
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
          questions:        interview.questions,
          history:          historyRef.current,
          candidate_answer: '',
          round_type:       interview.round,
        }),
      })
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const { reply } = await res.json()
      pushTurn({ role: 'interviewer', text: reply })
      startTimer()
      if (!candidateAnswer || waitingRef.current) {
        waitingRef.current = false; speakText(reply)
      } else {
        pendingReplyRef.current = reply
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not reach backend')
      setPhase('error')
    }
  }

  // Avatar iframe messages
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (!e.data?.type) return
      if (e.data.type === 'ready')            fetchNext('')
      else if (e.data.type === 'speaking-stopped') {
        if (isFillerRef.current) {
          isFillerRef.current = false
          if (pendingReplyRef.current) { speakText(pendingReplyRef.current); pendingReplyRef.current = null }
          else { setPhase('processing'); waitingRef.current = true }
        } else {
          // Check if current question is a coding challenge
          const cq = currentCodingQuestion()
          if (cq && !codingSubmittedRef.current) {
            setCodingActive(true)
          } else {
            startListening()
          }
        }
      }
      else if (e.data.type === 'error') { setErrorMsg(e.data.message || 'Avatar error'); setPhase('error') }
    }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])

  const iframeSrc = `/avatar.html?avatar=${encodeURIComponent(AVATAR_URL)}&speaker=${SPEAKER}&body=F&apiBase=${encodeURIComponent(BASE)}`

  const sophiaWrap = codingActive
    ? 'absolute top-0 bottom-16 left-0 w-[38%]'
    : { spotlight:'absolute inset-0 bottom-16', sideBySide:'absolute top-0 bottom-16 left-0 w-[60%]', youFocused:'absolute top-3 bottom-[4.8rem] right-3 w-[34%] rounded-2xl overflow-hidden shadow-2xl' }[viewMode]
  const camWrap = { spotlight:'absolute bottom-[4.8rem] right-4 w-52 h-[155px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl', sideBySide:'absolute top-0 bottom-16 right-0 w-[40%]', youFocused:'absolute top-0 bottom-16 left-0 w-[66%]' }[viewMode]

  // Current coding question for the render
  const currentCQ = (() => {
    const iTurns = history.filter(t => t.role === 'interviewer').length
    const idx    = Math.max(0, iTurns - 1)
    const q      = interview.questions[idx] as InterviewQuestion | undefined
    return (q?.category === 'coding' && q?.coding_challenge) ? q : null
  })()

  return (
    <div className="relative w-full h-screen bg-[#07071a] overflow-hidden select-none font-sans">

      {/* Sophia iframe */}
      <div className={`${sophiaWrap} transition-all duration-500`}>
        <iframe ref={iframeRef} src={iframeSrc} className="w-full h-full border-0" allow="autoplay" />
        {phase === 'speaking' && !codingActive && viewMode === 'spotlight' && (
          <div className="absolute inset-0 pointer-events-none ring-inset ring-2 ring-blue-500/20 animate-pulse" />
        )}
        {/* Sophia hint bubble overlaid on her panel during coding */}
        {sophiaHint && codingActive && (
          <div className="absolute bottom-4 left-3 right-3 z-10 bg-[#130d28]/90 backdrop-blur-xl border border-violet-500/25 rounded-xl px-3 py-2.5 pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 shrink-0" />
              <span className="text-violet-300/65 text-[10px] font-semibold tracking-wide uppercase">Sophia</span>
            </div>
            <p className="text-white/70 text-[11.5px] italic leading-relaxed">{sophiaHint}</p>
          </div>
        )}
      </div>

      {/* Coding panel — right 62% when active */}
      {codingActive && currentCQ?.coding_challenge && (
        <div className="absolute top-0 bottom-16 right-0 w-[62%] z-10">
          <CodingPanel
            challenge={currentCQ.coding_challenge}
            BASE={BASE}
            sophiaHint={sophiaHint}
            onSubmit={handleCodeSubmit}
            onHintRequest={handleHintRequest}
          />
        </div>
      )}

      {/* Camera feed pip — hidden during coding or fullscreen */}
      {!codingActive && !camFullscreen && (
      <div className={`${camWrap} transition-all duration-500 bg-[#040d18] ${camOn ? 'ring-1 ring-cyan-500/30' : 'border border-white/5'}`}>
        <video ref={cameraRef} autoPlay muted playsInline className={`w-full h-full object-cover scale-x-[-1] ${camOn?'block':'hidden'}`} />
        {!camOn && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-14 h-14 rounded-full bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="text-cyan-400/30 text-[10px]">{camDenied?'Camera blocked':'Camera off'}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 text-cyan-400/50 text-[10px] font-semibold tracking-widest uppercase">You</div>
      </div>
      )}

      {/* Fullscreen camera overlay — shown when camOn && camFullscreen */}
      {camFullscreen && camOn && (
        <div className="absolute inset-0 z-40 bg-black flex items-center justify-center">
          <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          {/* Gradient overlay for controls visibility */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          {/* Exit fullscreen button top-right */}
          <button
            onClick={() => setCamFullscreen(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur border border-white/15 text-white/60 hover:text-white hover:bg-black/70 flex items-center justify-center transition-all text-sm"
            title="Exit fullscreen"
          >✕</button>
          {/* YOU label */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400/80 text-[11px] font-semibold tracking-widest uppercase">You · Live</span>
          </div>
          {/* Bottom controls — just End */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={() => setShowEndModal(true)}
              className="flex items-center gap-2 h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium shadow-[0_0_18px_rgba(220,38,38,0.45)] transition-all"
            >
              <Icon.PhoneOff /><span>End Interview</span>
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-13 z-20 flex items-center px-5 py-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent gap-3 pointer-events-none">
        <div className="flex items-center gap-2">
          {callLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />}
          <span className="text-white/75 text-[13px] font-medium tracking-wide">Sophia · {interview.round_label}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {phase === 'loading'    && <Chip color="gray">Loading…</Chip>}
          {phase === 'speaking'   && <Chip color="blue" pulse>Sophia speaking</Chip>}
          {phase === 'processing' && <Chip color="blue" pulse>Thinking…</Chip>}
          {phase === 'muted'      && <Chip color="yellow">You're muted</Chip>}
          {phase === 'error'      && <Chip color="red">Error</Chip>}
        </div>
        {callLive && <span className="text-white/40 text-xs font-mono tabular-nums">{fmt(callSecs)}</span>}
      </div>

      {/* View toast */}
      {viewToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-4 py-1.5 text-white/70 text-xs font-medium">{viewToast}</div>
      )}

      {/* Listening indicator (always shown while listening) */}
      {phase === 'listening' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 bg-black/65 backdrop-blur-2xl border border-white/10 rounded-2xl px-5 py-3 shadow-xl">
            <Waveform />
            <div className="flex flex-col">
              <span className="text-white/85 text-sm font-semibold">Your turn</span>
              <span className="text-white/40 text-[11px]">Speak — stops automatically</span>
            </div>
          </div>
        </div>
      )}

      {/* Captions overlay — live subtitles */}
      {showCaptions && !codingActive && (
        <div className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-20 w-[min(620px,88vw)] pointer-events-none">
          {/* Live speech while listening */}
          {phase === 'listening' && liveText && (
            <div className="mb-2 flex justify-end">
              <div className="max-w-[80%] bg-cyan-500/10 backdrop-blur border border-cyan-500/20 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-cyan-400/50 font-medium uppercase tracking-wide block mb-0.5">You</span>
                <p className="text-white/70 text-[13px] leading-snug italic">"{liveText}"</p>
              </div>
            </div>
          )}
          {/* Last interviewer line */}
          {history.length > 0 && history[history.length - 1].role === 'interviewer' && phase !== 'listening' && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-white/5 backdrop-blur border border-white/8 rounded-xl px-4 py-2">
                <span className="text-[10px] text-violet-400/50 font-medium uppercase tracking-wide block mb-0.5">Sophia</span>
                <p className="text-white/60 text-[13px] leading-snug">{history[history.length - 1].text}</p>
              </div>
            </div>
          )}
          {/* Last candidate line when Sophia is responding */}
          {history.length > 0 && history[history.length - 1].role === 'candidate' && (phase === 'processing' || phase === 'speaking') && (
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-cyan-500/10 backdrop-blur border border-cyan-500/20 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-cyan-400/50 font-medium uppercase tracking-wide block mb-0.5">You</span>
                <p className="text-white/70 text-[13px] leading-snug">{history[history.length - 1].text}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error toast */}
      {phase === 'error' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 backdrop-blur-xl border border-red-500/25 rounded-xl px-5 py-3 text-red-200 text-sm max-w-md text-center shadow-xl">{errorMsg}</div>
      )}

      {/* Transcript panel */}
      {showTranscript && (
        <div className="absolute top-0 right-0 bottom-16 w-[300px] z-20 flex flex-col bg-black/[0.15] backdrop-blur-2xl border-l border-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <span className="text-white/70 text-sm font-semibold">Transcript</span>
            <button onClick={() => setShowTranscript(false)} className="text-white/30 hover:text-white text-lg">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {history.length === 0 && <p className="text-white/20 text-xs text-center mt-6">Conversation will appear here once the interview begins.</p>}
            {history.map((turn, i) => (
              <div key={i} className={`flex flex-col gap-1 ${turn.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                <span className="text-white/25 text-[10px] px-1">{turn.role === 'candidate' ? 'You' : 'Sophia'} · {turn.time}</span>
                <div className={`max-w-[88%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${turn.role === 'candidate' ? 'bg-blue-500/10 text-blue-100/70 border border-blue-400/10' : 'bg-white/[0.05] text-white/60 border border-white/[0.05]'}`}>{turn.text}</div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* End call confirmation */}
      {showEndModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d20] border border-white/10 rounded-2xl shadow-2xl w-72 overflow-hidden">
            <div className="px-5 py-5 flex flex-col gap-4">
              <div>
                <p className="text-white/90 font-semibold text-sm">End interview?</p>
                <p className="text-white/40 text-xs mt-1">Your session will be saved to your history.</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { downloadTranscript(); doEndCall(true) }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                  Save &amp; Download Transcript
                </button>
                <button onClick={() => doEndCall(true)}
                  className="w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-white/70 text-sm border border-white/6 transition-colors">
                  Save without downloading
                </button>
                <button onClick={() => setShowEndModal(false)}
                  className="w-full py-2 text-white/35 hover:text-white/60 text-sm transition-colors">
                  Continue interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div className="bg-[#0d0d20] border border-white/10 rounded-2xl shadow-2xl w-80 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <span className="text-white/90 font-semibold text-sm">Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-white/35 hover:text-white text-xl">✕</button>
            </div>
            <div className="px-5 py-4 space-y-3 text-[13px]">
              {[['Interviewer','Sophia'], ['Round', interview.round_label], ['Brain','GPT-4o-mini'], ['TTS','Edge Neural (Jenny)'], ['STT','OpenAI Whisper']].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/6 last:border-0">
                  <span className="text-white/45">{label}</span>
                  <span className="text-white/75">{val}</span>
                </div>
              ))}
              <div className="pt-2">
                <button onClick={cycleView} className="w-full py-2 rounded-xl bg-white/8 hover:bg-white/14 text-white/70 text-sm border border-white/6">Switch view layout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 z-20 bg-[#09091f]/92 backdrop-blur-2xl border-t border-white/6 flex items-center px-6 gap-3">
        <div className="flex-1">
          <span className="text-white/30 text-xs font-mono tabular-nums">{fmt(callSecs)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <CtrlBtn onClick={toggleMic} title={micMuted?'Unmute':'Mute'} active={micMuted}>{micMuted?<Icon.MicOff/>:<Icon.Mic/>}</CtrlBtn>
          <CtrlBtn onClick={toggleCamera} title={camOn?'Cam off':'Cam on'} active={!camOn}>{camOn?<Icon.Cam/>:<Icon.CamOff/>}</CtrlBtn>
          <CtrlBtn onClick={cycleView} title="Change layout"><Icon.Grid/></CtrlBtn>
          <button onClick={() => setShowCaptions(v => !v)} title={showCaptions ? 'Hide captions' : 'Show captions'}
            className={`w-11 h-11 rounded-full flex items-center justify-center border text-sm transition-all ${showCaptions?'bg-cyan-500/20 text-cyan-300/90 border-cyan-500/25':'bg-white/10 hover:bg-white/18 text-white/75 border-white/5'}`}>
            <Icon.CC/>
          </button>
          <button onClick={() => setShowTranscript(v => !v)} title="Transcript"
            className={`w-11 h-11 rounded-full flex items-center justify-center border text-sm transition-all ${showTranscript?'bg-blue-500/20 text-blue-300/90 border-blue-500/25':'bg-white/10 hover:bg-white/18 text-white/75 border-white/5'}`}>
            <Icon.Chat/>
          </button>
          <CtrlBtn onClick={() => setShowSettings(v => !v)} title="Settings"><Icon.Gear/></CtrlBtn>
          <CtrlBtn onClick={() => setShowEndModal(true)} title="End interview" danger wide>
            <Icon.PhoneOff/><span>End</span>
          </CtrlBtn>
        </div>
        <div className="flex-1 flex justify-end">
          <span className="text-white/20 text-[11px]">Sophia · AI Interviewer</span>
        </div>
      </div>
    </div>
  )
}
