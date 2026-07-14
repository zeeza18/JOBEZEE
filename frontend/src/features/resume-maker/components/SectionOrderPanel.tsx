import { useResumeMaker } from '../store/useResumeMaker'
import { SortableList } from './SortableList'

const LABELS: Record<string, string> = {
  experience: 'Experience', education: 'Education', skills: 'Skills',
  projects: 'Projects', certifications: 'Certifications',
}
const ORDERABLE_KEYS = Object.keys(LABELS)

export function SectionOrderPanel() {
  const { content, updateContent } = useResumeMaker()
  const items = content.section_order
    .filter((k) => ORDERABLE_KEYS.includes(k))
    .map((k) => ({ id: k }))

  const handleReorder = (next: { id: string }[]) =>
    updateContent((prev) => {
      const rest = prev.section_order.filter((k) => !ORDERABLE_KEYS.includes(k))
      // 'summary' (always rendered first) stays wherever it was; append reordered rest after it
      const summaryFirst = rest.filter((k) => k === 'summary')
      const others = rest.filter((k) => k !== 'summary')
      return { ...prev, section_order: [...summaryFirst, ...next.map((i) => i.id), ...others] }
    })

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">Drag to change section order (Summary always appears first)</p>
      <SortableList
        items={items}
        onReorder={handleReorder}
        renderItem={(item) => <span className="text-sm font-medium text-slate-700">{LABELS[item.id]}</span>}
      />
    </div>
  )
}
