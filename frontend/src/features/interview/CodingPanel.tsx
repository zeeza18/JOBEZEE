'use client'

import { useEffect, useRef, useState } from 'react'
import type { CodingChallenge } from '../../lib/api'

export interface TestResult {
  passed: boolean
  actual: string
  expected: string
  call: string
  error?: string | null
}

interface Props {
  challenge: CodingChallenge
  BASE: string
  sophiaHint: string | null
  onSubmit: (code: string, results: TestResult[]) => void
  onHintRequest: (code: string, hintIndex: number) => void
}

const LANGS = ['python', 'javascript', 'sql', 'bash']

export default function CodingPanel({ challenge, BASE, sophiaHint, onSubmit, onHintRequest }: Props) {
  const [code, setCode]               = useState(challenge.starter_code)
  const [language, setLanguage]       = useState(challenge.language || 'python')
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)
  const [running, setRunning]         = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintIdxRef    = useRef(0)

  // Inactivity hint trigger — fires every 20s of no typing while unsolved
  useEffect(() => {
    if (submitted) return
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(() => {
      if (!submitted && hintIdxRef.current < challenge.hints.length) {
        onHintRequest(code, hintIdxRef.current)
        hintIdxRef.current++
      }
    }, 20_000)
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current) }
  }, [code, submitted])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el  = e.currentTarget
      const s   = el.selectionStart
      const end = el.selectionEnd
      const next = code.substring(0, s) + '    ' + code.substring(end)
      setCode(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4 })
    }
  }

  const handleRun = async () => {
    if (running || submitted || !code.trim()) return
    setRunning(true)
    try {
      const res = await fetch(`${BASE}/api/interview/run-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, test_cases: challenge.test_cases }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const { results } = await res.json()
      setTestResults(results)
      setSubmitted(true)
      onSubmit(code, results)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Execution error'
      const fallback: TestResult[] = challenge.test_cases.map(tc => ({
        passed: false, actual: errMsg, expected: tc.expected, call: tc.call, error: errMsg,
      }))
      setTestResults(fallback)
      setSubmitted(true)
      onSubmit(code, fallback)
    } finally {
      setRunning(false)
    }
  }

  const passed = testResults ? testResults.filter(r => r.passed).length : 0

  return (
    <div className="flex flex-col h-full bg-[#08081a] border-l border-white/8 overflow-hidden">

      {/* Problem statement */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/8 overflow-y-auto max-h-[32%]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/85 font-semibold text-[13px]">Coding Challenge</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300/80 border border-violet-500/20 font-medium">{language}</span>
        </div>
        <p className="text-white/58 text-[12.5px] leading-relaxed whitespace-pre-wrap">{challenge.problem}</p>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/6 bg-[#06060f]">
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          disabled={submitted}
          className="text-[11px] bg-white/8 text-white/55 border border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer disabled:opacity-50"
        >
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-white/18 text-[10px]">Tab = 4 spaces · Ctrl+Enter to run</span>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden" onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleRun() }}>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          className="w-full h-full bg-[#050510] text-[#c9d1d9] text-[12.5px] leading-[1.7] p-4 resize-none outline-none border-0 disabled:opacity-55 caret-violet-400"
          style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace" }}
        />
      </div>

      {/* Sophia hint bubble — floats over editor */}
      {sophiaHint && !submitted && (
        <div className="shrink-0 mx-3 mb-2 bg-[#130d28]/90 backdrop-blur-xl border border-violet-500/25 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 shrink-0" />
            <span className="text-violet-300/65 text-[10px] font-semibold tracking-wide uppercase">Sophia</span>
          </div>
          <p className="text-white/65 text-[11.5px] italic leading-relaxed">{sophiaHint}</p>
        </div>
      )}

      {/* Test results */}
      {testResults && (
        <div className="shrink-0 border-t border-white/8 px-4 py-3 space-y-1.5 bg-[#060612]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/50 text-[11px] font-medium">Test Results</span>
            <span className={`text-[12px] font-bold tabular-nums ${passed === 3 ? 'text-green-400' : passed >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
              {passed}/3 passed
            </span>
          </div>
          {testResults.map((r, i) => (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg text-[11px] font-mono border ${r.passed ? 'bg-green-500/6 border-green-500/15' : 'bg-red-500/6 border-red-500/15'}`}>
              <span className={`shrink-0 mt-0.5 font-bold ${r.passed ? 'text-green-400' : 'text-red-400'}`}>{r.passed ? '✓' : '✗'}</span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-white/45 truncate">{r.call}</div>
                <div className="text-white/30">expected: <span className="text-white/50">{r.expected}</span></div>
                {!r.passed && <div className="text-red-300/65">got: {r.actual}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit bar */}
      {!submitted && (
        <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center gap-3 bg-[#07071a]">
          <button
            onClick={handleRun}
            disabled={running || !code.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-all"
          >
            {running
              ? <><span className="w-3 h-3 border-2 border-white/35 border-t-white rounded-full animate-spin" />Running…</>
              : <>▶ Run &amp; Submit</>
            }
          </button>
          <div className="flex items-center gap-1.5">
            {challenge.test_cases.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/12" />
            ))}
          </div>
          <span className="text-white/22 text-[10px]">{challenge.test_cases.length} test cases</span>
        </div>
      )}

      {/* Post-submit banner */}
      {submitted && (
        <div className={`shrink-0 px-4 py-2.5 text-[12px] font-medium text-center border-t border-white/8 ${
          passed === 3 ? 'bg-green-500/10 text-green-300/80' :
          passed >= 1  ? 'bg-yellow-500/10 text-yellow-300/80' :
                         'bg-red-500/10 text-red-300/70'
        }`}>
          {passed === 3 ? '🎉 All test cases passed! Waiting for Sophia...' :
           passed >= 1  ? `${passed}/3 passed — Sophia will follow up...` :
                          'No tests passed — Sophia will explain the approach...'}
        </div>
      )}
    </div>
  )
}
