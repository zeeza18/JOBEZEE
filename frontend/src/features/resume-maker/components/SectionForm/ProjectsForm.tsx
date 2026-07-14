import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'
import { BulletListEditor } from '../BulletListEditor'
import type { ResumeProjectItem } from '../../../../lib/api'

export function ProjectsForm() {
  const { content, updateContent } = useResumeMaker()

  const patch = (id: string, fields: Partial<ResumeProjectItem>) =>
    updateContent((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === id ? { ...p, ...fields } : p)) }))

  const add = () =>
    updateContent((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: genId('proj'), name: '', description: '', bullets: [], link: '', tech: [] }],
    }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.projects}
        onReorder={(next) => updateContent((prev) => ({ ...prev, projects: next }))}
        onRemove={remove}
        emptyLabel="No projects added yet."
        renderItem={(proj) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Project name" value={proj.name} onChange={(e) => patch(proj.id, { name: e.target.value })} />
              <Input placeholder="Link (optional)" value={proj.link} onChange={(e) => patch(proj.id, { link: e.target.value })} />
            </div>
            <Input placeholder="One-line description" value={proj.description} onChange={(e) => patch(proj.id, { description: e.target.value })} />
            <Input
              placeholder="Tech, comma-separated (e.g. React, FastAPI)"
              value={proj.tech.join(', ')}
              onChange={(e) => patch(proj.id, { tech: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
            />
            <BulletListEditor bullets={proj.bullets} onChange={(bullets) => patch(proj.id, { bullets })} />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add project
      </Button>
    </div>
  )
}
