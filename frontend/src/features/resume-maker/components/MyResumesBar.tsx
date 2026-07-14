import { Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useResumeMaker } from '../store/useResumeMaker'

export function MyResumesBar() {
  const { documents, activeId, creating, selectDocument, createDocument, duplicateDocument, deleteDocument } = useResumeMaker()

  const handleDelete = (id: string, title: string) => {
    if (documents.length <= 1) {
      alert("You need at least one resume — create another before deleting this one.")
      return
    }
    if (confirm(`Delete "${title}"? This can't be undone.`)) {
      deleteDocument(id)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {documents.map((doc) => {
        const active = doc.id === activeId
        return (
          <div
            key={doc.id}
            className={cn(
              'group flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
              active ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            )}
          >
            <button type="button" onClick={() => selectDocument(doc.id)} className="max-w-[140px] truncate">
              {doc.title || 'Untitled'}
            </button>
            <button
              type="button" onClick={() => duplicateDocument(doc.id)}
              className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-cyan-500"
              title="Duplicate"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button" onClick={() => handleDelete(doc.id, doc.title)}
              className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )
      })}
      <button
        type="button" onClick={() => createDocument(false)} disabled={creating}
        className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-50"
      >
        {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        New resume
      </button>
    </div>
  )
}
