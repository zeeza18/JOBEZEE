import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { resumeBuilderApi } from '../../../lib/api'
import type { ResumeDocumentContent, ResumeDocumentSettings } from '../../../lib/api'

const DEBOUNCE_MS = 400

export function LivePreviewFrame({ content, settings }: { content: ResumeDocumentContent; settings: ResumeDocumentSettings }) {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestId.current
      try {
        const res = await resumeBuilderApi.previewHtml(content, settings)
        if (requestId.current === thisRequest) {
          setHtml(res.html)
          setError(null)
        }
      } catch (err: unknown) {
        if (requestId.current === thisRequest) {
          setError(err instanceof Error ? err.message : 'Preview failed to load')
        }
      } finally {
        if (requestId.current === thisRequest) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [content, settings])

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white p-4 text-center text-xs text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="relative">
      {loading && !html && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}
      {html && (
        <iframe
          title="Resume preview"
          srcDoc={html}
          className="w-full rounded-xl"
          style={{ border: 'none', height: '100vh', minHeight: 700 }}
        />
      )}
    </div>
  )
}
