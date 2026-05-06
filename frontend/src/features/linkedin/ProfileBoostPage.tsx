import { useCallback, useRef, useState } from 'react'
import {
  AlertCircle, Camera, CheckCircle2, FileText, Lightbulb,
  Loader2, Sparkles, Star, Upload, X, Zap,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  type ImageAnalysisResult,
  type ResumeAnalysisResult,
  resumeAnalysisApi,
} from '../../lib/api'

// ─── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500' :
    'bg-red-500'
  return (
    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  label, score, content, suggestions,
}: {
  label    : string
  score    : number
  content  : string
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)
  const color =
    score >= 80 ? 'border-emerald-200' :
    score >= 60 ? 'border-amber-200' :
    'border-red-200'

  return (
    <div className={`rounded-xl border ${color} bg-white p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          {score >= 80 && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-slate-800">{score}</span>
          <ScoreBar score={score} />
          <button
            onClick={() => setOpen(o => !o)}
            className="text-xs text-slate-400 hover:text-slate-700 transition ml-1"
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 pt-1">
          {content && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {content}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Suggestions</p>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Overall score badge ──────────────────────────────────────────────────────

function OverallBadge({ score, verdict }: { score: number; verdict: string }) {
  const color =
    score >= 80 ? 'text-emerald-600' :
    score >= 60 ? 'text-amber-600' :
    'text-red-600'
  const bg =
    score >= 80 ? 'bg-emerald-50 border-emerald-200' :
    score >= 60 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'
  return (
    <div className={`rounded-2xl border ${bg} p-6 flex flex-col items-center gap-3`}>
      <div className={`text-5xl font-black ${color}`}>{score}</div>
      <p className="text-sm font-semibold text-slate-600">/ 100</p>
      <div className="flex items-center gap-2">
        <Sparkles className={`h-4 w-4 ${color}`} />
        <span className={`text-sm font-bold ${color}`}>{verdict}</span>
      </div>
    </div>
  )
}

// ─── JD fit badge ─────────────────────────────────────────────────────────────

function JdFitBadge({ score }: { score: number }) {
  if (!score) return null
  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-3`}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JD Fit Score</span>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-black ${color}`}>{score}</span>
        <ScoreBar score={score} />
      </div>
    </div>
  )
}

// ─── Image feedback panel ──────────────────────────────────────────────────────

function ImageFeedback({ result }: { result: ImageAnalysisResult }) {
  const color = result.score >= 80 ? 'text-emerald-600' : result.score >= 60 ? 'text-amber-600' : 'text-red-600'
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Photo Analysis</p>
        <span className={`text-xl font-black ${color}`}>{result.score}/100</span>
      </div>
      <p className={`text-xs font-semibold ${color}`}>{result.verdict}</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        {[
          ['Lighting', result.lighting],
          ['Background', result.background],
          ['Framing', result.framing],
          ['Face visibility', result.face_visibility],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-medium">{label}: </span>
            <span className="capitalize">{value}</span>
          </div>
        ))}
      </div>
      {result.improvements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tips</p>
          {result.improvements.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({
  accept, label, hint, icon: Icon,
  file, onFile, children,
}: {
  accept        : string
  label         : string
  hint          : string
  icon          : React.ElementType
  file          : File | null
  onFile        : (f: File) => void
  children?     : React.ReactNode
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = (f: File) => { if (f) onFile(f) }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
        dragOver ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; handle(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 text-center">
        {file ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">Click to replace</p>
          </>
        ) : (
          <>
            <Icon className="h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────────

export default function ProfileBoostPage() {
  // Resume state
  const [resumeFile,   setResumeFile]   = useState<File | null>(null)
  const [resumeText,   setResumeText]   = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError,  setResumeError]  = useState<string | null>(null)
  const [resumeLoaded, setResumeLoaded]  = useState(false)

  // JD state
  const [jdText, setJdText] = useState('')

  // Image state
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [imageResult, setImageResult] = useState<ImageAnalysisResult | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError,  setImageError]  = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Analysis state
  const [analyzing,   setAnalyzing]   = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Upload resume → extract text
  const handleResumeUpload = useCallback(async (file: File) => {
    setResumeFile(file)
    setResumeError(null)
    setResumeLoaded(false)
    setResumeText('')
    setAnalysisResult(null)
    setImageResult(null)

    setResumeLoading(true)
    try {
      const data = await resumeAnalysisApi.extractPdf(file) as { text: string }
      setResumeText(data.text)
      setResumeLoaded(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setResumeError(msg)
    } finally {
      setResumeLoading(false)
    }
  }, [])

  // Upload image → preview + analysis
  const handleImageUpload = useCallback(async (file: File) => {
    setImageFile(file)
    setImageError(null)
    setImageResult(null)
    setImageLoading(true)

    // Local preview
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      const result = await resumeAnalysisApi.analyzeImage(file) as ImageAnalysisResult
      setImageResult(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setImageError(msg)
    } finally {
      setImageLoading(false)
    }
  }, [])

  // Analyze
  const handleAnalyze = useCallback(async () => {
    if (!resumeText.trim()) return
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    try {
      const result = await resumeAnalysisApi.analyze({
        resume_text: resumeText,
        job_description: jdText.trim() || undefined,
      }) as ResumeAnalysisResult
      setAnalysisResult(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setAnalysisError(msg)
    } finally {
      setAnalyzing(false)
    }
  }, [resumeText, jdText])

  const canAnalyze = resumeLoaded && !analyzing

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-cyan-600 uppercase tracking-widest mb-1">Profile Boost</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Resume Analyzer</h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload your resume, get section-by-section scores and actionable tips</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6">

        {/* ── LEFT: Inputs ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Resume upload */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">Resume</p>
              {resumeLoaded && <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Loaded</span>}
            </div>
            <DropZone
              accept=".pdf,.docx,.doc,.txt"
              label="Upload your resume"
              hint="PDF, DOCX, or TXT"
              icon={FileText}
              file={resumeFile}
              onFile={handleResumeUpload}
            />
            {resumeLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Extracting text…
              </div>
            )}
            {resumeError && (
              <div className="flex items-start gap-2 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{resumeError}</span>
              </div>
            )}
          </Card>

          {/* Profile photo */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">Profile Photo (optional)</p>
              {imageResult && <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Analyzed</span>}
            </div>
            <DropZone
              accept="image/jpeg,image/png,image/webp"
              label="Upload a profile photo"
              hint="JPG, PNG, or WebP"
              icon={Camera}
              file={imageFile}
              onFile={handleImageUpload}
            />
            {imageLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing photo…
              </div>
            )}
            {imageError && (
              <div className="flex items-start gap-2 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{imageError}</span>
              </div>
            )}
          </Card>

          {/* JD (optional) */}
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-800">Job Description (optional)</p>
            </div>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white transition placeholder-slate-400"
              placeholder="Paste the job description here to get a JD-fit score…"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              rows={6}
            />
          </Card>

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Zap className="h-4 w-4" /> Analyze Resume</>
            )}
          </Button>
          {analysisError && (
            <div className="flex items-start gap-2 text-xs text-red-500 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{analysisError}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ───────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* No results yet */}
          {!analysisResult && !analyzing && (
            <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center border-2 border-dashed border-slate-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Sparkles className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">No analysis yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload a resume and click Analyze to get started</p>
              </div>
            </Card>
          )}

          {/* Loading skeleton */}
          {analyzing && (
            <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm font-semibold text-slate-500">Analyzing your resume…</p>
              <p className="text-xs text-slate-400">This takes about 10–20 seconds</p>
            </Card>
          )}

          {/* Results */}
          {analysisResult && (
            <div className="space-y-4">
              {/* Overall score + JD fit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <OverallBadge score={analysisResult.overall_score} verdict={analysisResult.overall_verdict} />
                {analysisResult.jd_fit_score > 0 && (
                  <div className="flex flex-col gap-3">
                    <JdFitBadge score={analysisResult.jd_fit_score} />
                    {/* Section count */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sections scored</span>
                      <span className="text-sm font-bold text-slate-700">{analysisResult.sections.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Section Scores</p>
                <div className="space-y-2">
                  {analysisResult.sections.map(s => (
                    <SectionCard
                      key={s.id}
                      label={s.label}
                      score={s.score}
                      content={s.content}
                      suggestions={s.suggestions}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image feedback */}
          {imageResult && (
            <ImageFeedback result={imageResult} />
          )}

          {/* Image preview */}
          {imagePreview && imageFile && !imageResult && !imageLoading && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Photo Preview</p>
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); setImageResult(null) }}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img
                src={imagePreview}
                alt="Profile preview"
                className="w-full max-h-64 object-contain rounded-xl bg-slate-100"
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
