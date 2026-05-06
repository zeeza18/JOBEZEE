import { useCallback, useRef, useState } from 'react'
import {
  AlertCircle, ArrowRight, Camera, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Lightbulb, Loader2, Pencil, Sparkles, Target, Upload, Zap,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketScore {
  id:        string
  label:     string
  score:     number
  max:       number
  pct:       number
  strengths: string[]
  gaps:      string[]
}

interface PriorityFix {
  section: string
  issue:   string
  fix:     string
  impact:  'High' | 'Medium' | 'Low'
}

interface HeadlineRewrite {
  current:  string
  improved: string
  reason:   string
}

interface ImageResult {
  score:        number
  suggestions:  string[]
  observations: Record<string, boolean | null>
}

interface BoostResult {
  overall_score:    number
  grade:            string
  overall_verdict:  string
  jd_fit_score:     number
  buckets:          BucketScore[]
  top_strengths:    string[]
  top_gaps:         string[]
  priority_fixes:   PriorityFix[]
  headline_rewrite: HeadlineRewrite | null
  about_tips:       string[]
  visual_notes:     string[]
  profile_image?:   ImageResult
  cover_image?:     ImageResult
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  accept, label, hint, icon: Icon, file, onFile,
}: {
  accept: string
  label:  string
  hint:   string
  icon:   React.ElementType
  file:   File | null
  onFile: (f: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`rounded-xl border-2 border-dashed transition-all cursor-pointer ${
        dragOver  ? 'border-cyan-400 bg-cyan-50' :
        file      ? 'border-emerald-300 bg-emerald-50' :
                    'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div className="flex items-center gap-3 px-4 py-3">
        {file ? (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">Click to replace</p>
            </div>
          </>
        ) : (
          <>
            <Icon className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className="text-xs text-slate-400">{hint}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Overall badge ────────────────────────────────────────────────────────────

function OverallBadge({ score, grade, verdict }: { score: number; grade: string; verdict: string }) {
  const [color, bg] =
    score >= 80 ? ['text-emerald-600', 'bg-emerald-50 border-emerald-200'] :
    score >= 65 ? ['text-cyan-600',    'bg-cyan-50 border-cyan-200']       :
    score >= 50 ? ['text-amber-600',   'bg-amber-50 border-amber-200']     :
                  ['text-red-600',     'bg-red-50 border-red-200']
  return (
    <div className={`rounded-2xl border ${bg} p-5 flex items-center gap-5`}>
      <div className={`text-6xl font-black tabular-nums ${color}`}>{score}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">/ 100</p>
        <p className={`text-xl font-bold ${color}`}>{grade}</p>
        <p className="text-xs text-slate-500 mt-0.5 max-w-[220px] leading-snug">{verdict}</p>
      </div>
    </div>
  )
}

// ─── Bucket card ──────────────────────────────────────────────────────────────

function BucketCard({ bucket }: { bucket: BucketScore }) {
  const [open, setOpen] = useState(false)
  const borderColor = bucket.pct >= 80 ? 'border-emerald-200' : bucket.pct >= 60 ? 'border-amber-200' : 'border-red-200'
  const textColor   = bucket.pct >= 80 ? 'text-emerald-600'   : bucket.pct >= 60 ? 'text-amber-600'   : 'text-red-600'

  return (
    <div className={`rounded-xl border ${borderColor} bg-white p-3.5 space-y-2`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-slate-800">{bucket.label}</span>
            <span className={`text-sm font-bold shrink-0 ${textColor}`}>{bucket.score}/{bucket.max}</span>
          </div>
          <ScoreBar pct={bucket.pct} />
        </div>
        <button className="text-slate-400 hover:text-slate-700 shrink-0 transition">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {bucket.strengths.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Strengths</p>
              {bucket.strengths.map((s, i) => (
                <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
                  <span className="text-emerald-500 shrink-0">✓</span>{s}
                </p>
              ))}
            </div>
          )}
          {bucket.gaps.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Gaps</p>
              {bucket.gaps.map((g, i) => (
                <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
                  <span className="text-red-400 shrink-0">✗</span>{g}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Priority fix card ────────────────────────────────────────────────────────

function FixCard({ fix, idx }: { fix: PriorityFix; idx: number }) {
  const impactClass =
    fix.impact === 'High'   ? 'bg-red-100 text-red-700'    :
    fix.impact === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold shrink-0">
          {idx + 1}
        </span>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{fix.section}</span>
        <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${impactClass}`}>
          {fix.impact}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{fix.issue}</p>
      <div className="flex items-start gap-1.5 text-xs text-slate-600">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-cyan-500" />
        <span>{fix.fix}</span>
      </div>
    </div>
  )
}

// ─── Image panel ──────────────────────────────────────────────────────────────

function ImagePanel({ label, result }: { label: string; result: ImageResult }) {
  const color = result.score >= 80 ? 'text-emerald-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="space-y-1.5 pb-3 last:pb-0 border-b last:border-0 border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{result.score}/100</span>
      </div>
      {result.suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
          <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfileBoostPage() {
  const [pdfFile,      setPdfFile]      = useState<File | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [coverImage,   setCoverImage]   = useState<File | null>(null)
  const [targetRole,   setTargetRole]   = useState('')
  const [jdText,       setJdText]       = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [result,    setResult]    = useState<BoostResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    if (!pdfFile) return
    setAnalyzing(true)
    setError(null)
    setResult(null)

    const fd = new FormData()
    fd.append('profile_pdf', pdfFile)
    if (profileImage)      fd.append('profile_image',   profileImage)
    if (coverImage)        fd.append('cover_image',     coverImage)
    if (jdText.trim())     fd.append('job_description', jdText.trim())
    if (targetRole.trim()) fd.append('target_role',     targetRole.trim())

    try {
      const res  = await fetch('/api/linkedin-boost/analyze', {
        method: 'POST', credentials: 'include', body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setResult(data as BoostResult)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAnalyzing(false)
    }
  }, [pdfFile, profileImage, coverImage, jdText, targetRole])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">LinkedIn Profile Scorer</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Upload your LinkedIn PDF and get an 8-bucket score with AI-powered suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6">

        {/* ── LEFT: Inputs ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* LinkedIn PDF */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">LinkedIn Profile PDF</p>
              <span className="ml-auto text-xs text-red-500 font-medium">required</span>
            </div>
            <DropZone
              accept=".pdf,.txt"
              label="Upload your LinkedIn PDF export"
              hint='LinkedIn → "Save to PDF" on your profile page'
              icon={Upload}
              file={pdfFile}
              onFile={setPdfFile}
            />
          </Card>

          {/* Photos */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">
                Photos <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Profile Photo</p>
                <DropZone
                  accept="image/jpeg,image/png,image/webp"
                  label="Upload profile photo"
                  hint="JPG, PNG, or WebP"
                  icon={Camera}
                  file={profileImage}
                  onFile={setProfileImage}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Cover / Banner</p>
                <DropZone
                  accept="image/jpeg,image/png,image/webp"
                  label="Upload cover / banner image"
                  hint="JPG, PNG, or WebP"
                  icon={Upload}
                  file={coverImage}
                  onFile={setCoverImage}
                />
              </div>
            </div>
          </Card>

          {/* Target Role */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">
                Target Role <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </p>
            </div>
            <input
              type="text"
              placeholder="e.g. Senior Data Engineer, Product Manager"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400"
            />
          </Card>

          {/* Job Description */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">
                Job Description <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </p>
            </div>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400"
              placeholder="Paste a job description for a JD fit score…"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              rows={5}
            />
          </Card>

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!pdfFile || analyzing}
            className="w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            {analyzing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
              : <><Zap className="h-4 w-4" /> Analyze Profile</>
            }
          </Button>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Empty state */}
          {!result && !analyzing && (
            <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center border-2 border-dashed border-slate-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Sparkles className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">No analysis yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload your LinkedIn PDF and click Analyze Profile</p>
              </div>
            </Card>
          )}

          {/* Loading */}
          {analyzing && (
            <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <div>
                <p className="text-sm font-semibold text-slate-600">Scoring your LinkedIn profile…</p>
                <p className="text-xs text-slate-400 mt-1">Claude Opus Max is analyzing 8 scoring buckets</p>
              </div>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">

              {/* Overall score */}
              <OverallBadge
                score={result.overall_score}
                grade={result.grade}
                verdict={result.overall_verdict}
              />

              {/* JD fit */}
              {result.jd_fit_score > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JD Fit Score</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-lg font-black ${
                      result.jd_fit_score >= 80 ? 'text-emerald-600' :
                      result.jd_fit_score >= 60 ? 'text-amber-600'   : 'text-red-600'
                    }`}>{result.jd_fit_score}</span>
                    <div className="w-24"><ScoreBar pct={result.jd_fit_score} /></div>
                  </div>
                </div>
              )}

              {/* Priority Fixes */}
              {result.priority_fixes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Priority Fixes</p>
                  <div className="space-y-2">
                    {result.priority_fixes.map((fix, i) => (
                      <FixCard key={i} fix={fix} idx={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* 8 Bucket Scores */}
              {result.buckets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Bucket Scores</p>
                  <div className="space-y-2">
                    {result.buckets.map(b => <BucketCard key={b.id} bucket={b} />)}
                  </div>
                </div>
              )}

              {/* Headline Rewrite */}
              {result.headline_rewrite && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-cyan-600" />
                    <p className="text-sm font-semibold text-slate-800">Headline Rewrite</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Current</p>
                      <p className="text-slate-700">{result.headline_rewrite.current}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Improved</p>
                      <p className="text-slate-800 font-medium">{result.headline_rewrite.improved}</p>
                    </div>
                    <p className="text-xs text-slate-400 italic">{result.headline_rewrite.reason}</p>
                  </div>
                </Card>
              )}

              {/* About Tips */}
              {result.about_tips.length > 0 && (
                <Card className="p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-800">About Section Tips</p>
                  {result.about_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </Card>
              )}

              {/* Visual Analysis */}
              {(result.profile_image || result.cover_image || result.visual_notes.length > 0) && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-cyan-600" />
                    <p className="text-sm font-semibold text-slate-800">Visual Analysis</p>
                  </div>
                  {result.profile_image && <ImagePanel label="Profile Photo"   result={result.profile_image} />}
                  {result.cover_image   && <ImagePanel label="Cover / Banner"  result={result.cover_image}   />}
                  {result.visual_notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{n}</span>
                    </div>
                  ))}
                </Card>
              )}

              {/* Strengths & Gaps */}
              {(result.top_strengths.length > 0 || result.top_gaps.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {result.top_strengths.length > 0 && (
                    <Card className="p-3 space-y-2">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Top Strengths</p>
                      {result.top_strengths.map((s, i) => (
                        <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
                          <span className="text-emerald-500 shrink-0">✓</span>{s}
                        </p>
                      ))}
                    </Card>
                  )}
                  {result.top_gaps.length > 0 && (
                    <Card className="p-3 space-y-2">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Top Gaps</p>
                      {result.top_gaps.map((g, i) => (
                        <p key={i} className="text-xs text-slate-600 flex gap-1.5 leading-relaxed">
                          <span className="text-red-400 shrink-0">✗</span>{g}
                        </p>
                      ))}
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
