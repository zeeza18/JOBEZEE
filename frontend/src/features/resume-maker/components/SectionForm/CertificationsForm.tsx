import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'
import type { ResumeCertificationItem } from '../../../../lib/api'

export function CertificationsForm() {
  const { content, updateContent } = useResumeMaker()

  const patch = (id: string, fields: Partial<ResumeCertificationItem>) =>
    updateContent((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) => (c.id === id ? { ...c, ...fields } : c)),
    }))

  const add = () =>
    updateContent((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { id: genId('cert'), name: '', issuer: '', date: '', link: '' }],
    }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, certifications: prev.certifications.filter((c) => c.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.certifications}
        onReorder={(next) => updateContent((prev) => ({ ...prev, certifications: next }))}
        onRemove={remove}
        emptyLabel="No certifications added yet."
        renderItem={(cert) => (
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Certification name" value={cert.name} onChange={(e) => patch(cert.id, { name: e.target.value })} />
            <Input placeholder="Issuer" value={cert.issuer} onChange={(e) => patch(cert.id, { issuer: e.target.value })} />
            <Input placeholder="Date" value={cert.date} onChange={(e) => patch(cert.id, { date: e.target.value })} />
            <Input placeholder="Link (optional)" value={cert.link} onChange={(e) => patch(cert.id, { link: e.target.value })} />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add certification
      </Button>
    </div>
  )
}
