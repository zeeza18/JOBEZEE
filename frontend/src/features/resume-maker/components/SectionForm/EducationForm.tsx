import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'
import type { ResumeEducationItem } from '../../../../lib/api'

export function EducationForm() {
  const { content, updateContent } = useResumeMaker()

  const patch = (id: string, fields: Partial<ResumeEducationItem>) =>
    updateContent((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, ...fields } : e)),
    }))

  const add = () =>
    updateContent((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: genId('edu'), school: '', degree: '', field: '', location: '', start_date: '', end_date: '', gpa: '' },
      ],
    }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.education}
        onReorder={(next) => updateContent((prev) => ({ ...prev, education: next }))}
        onRemove={remove}
        emptyLabel="No education added yet."
        renderItem={(edu) => (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="School" value={edu.school} onChange={(e) => patch(edu.id, { school: e.target.value })} />
            <Input placeholder="Degree (e.g. B.S.)" value={edu.degree} onChange={(e) => patch(edu.id, { degree: e.target.value })} />
            <Input placeholder="Field of study" value={edu.field} onChange={(e) => patch(edu.id, { field: e.target.value })} />
            <Input placeholder="Location" value={edu.location} onChange={(e) => patch(edu.id, { location: e.target.value })} />
            <Input placeholder="Start" value={edu.start_date} onChange={(e) => patch(edu.id, { start_date: e.target.value })} />
            <Input placeholder="End" value={edu.end_date} onChange={(e) => patch(edu.id, { end_date: e.target.value })} />
            <Input placeholder="GPA (optional)" value={edu.gpa} onChange={(e) => patch(edu.id, { gpa: e.target.value })} />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add education
      </Button>
    </div>
  )
}
