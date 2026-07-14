import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'
import { BulletListEditor } from '../BulletListEditor'
import type { ResumeExperienceItem } from '../../../../lib/api'

export function ExperienceForm() {
  const { content, updateContent } = useResumeMaker()

  const patch = (id: string, fields: Partial<ResumeExperienceItem>) =>
    updateContent((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, ...fields } : e)),
    }))

  const add = () =>
    updateContent((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { id: genId('exp'), company: '', title: '', location: '', start_date: '', end_date: '', current: false, bullets: [] },
      ],
    }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.experience}
        onReorder={(next) => updateContent((prev) => ({ ...prev, experience: next }))}
        onRemove={remove}
        emptyLabel="No experience added yet."
        renderItem={(exp) => (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Job title" value={exp.title} onChange={(e) => patch(exp.id, { title: e.target.value })} />
              <Input placeholder="Company" value={exp.company} onChange={(e) => patch(exp.id, { company: e.target.value })} />
              <Input placeholder="Location" value={exp.location} onChange={(e) => patch(exp.id, { location: e.target.value })} />
              <div className="flex items-center gap-2">
                <Input placeholder="Start (e.g. Jan 2023)" value={exp.start_date} onChange={(e) => patch(exp.id, { start_date: e.target.value })} />
                <Input
                  placeholder="End" value={exp.current ? 'Present' : exp.end_date} disabled={exp.current}
                  onChange={(e) => patch(exp.id, { end_date: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" checked={exp.current} onChange={(e) => patch(exp.id, { current: e.target.checked })} />
              Currently work here
            </label>
            <BulletListEditor
              bullets={exp.bullets}
              onChange={(bullets) => patch(exp.id, { bullets })}
              context={[exp.title, exp.company].filter(Boolean).join(' at ')}
            />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add experience
      </Button>
    </div>
  )
}
