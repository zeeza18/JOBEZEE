import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useResumeMaker } from '../store/useResumeMaker'

export function ImportBar() {
  const navigate = useNavigate()
  const { importing, importFromProfile, sendToTailor } = useResumeMaker()
  const [importError, setImportError] = useState<string | null>(null)

  const handleImport = async () => {
    setImportError(null)
    if (!confirm('Import from your uploaded resume? This replaces the content currently in this resume.')) return
    try {
      await importFromProfile()
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed — upload a resume in Profile first.')
    }
  }

  const handleSendToTailor = () => {
    sendToTailor()
    navigate('/app/resume/tailor')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleImport} disabled={importing}
          icon={importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}>
          {importing ? 'Importing…' : 'Import from your resume'}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSendToTailor} icon={<Wand2 className="h-3.5 w-3.5" />}>
          Send to Tailor
        </Button>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Sparkles className="h-3 w-3" /> AI-structures your existing resume into sections
        </span>
      </div>
      {importError && <p className="text-xs text-red-600">{importError}</p>}
    </div>
  )
}
