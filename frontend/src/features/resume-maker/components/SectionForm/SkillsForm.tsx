import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'

export function SkillsForm() {
  const { content, updateContent } = useResumeMaker()

  const patchLabel = (id: string, label: string) =>
    updateContent((prev) => ({ ...prev, skills: prev.skills.map((s) => (s.id === id ? { ...s, label } : s)) }))

  const patchItems = (id: string, itemsText: string) =>
    updateContent((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, items: itemsText.split(',').map((x) => x.trim()).filter(Boolean) } : s)),
    }))

  const add = () =>
    updateContent((prev) => ({ ...prev, skills: [...prev.skills, { id: genId('skl'), label: '', items: [] }] }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.skills}
        onReorder={(next) => updateContent((prev) => ({ ...prev, skills: next }))}
        onRemove={remove}
        emptyLabel="No skill categories yet."
        renderItem={(sk) => (
          <div className="space-y-2">
            <Input placeholder="Category (e.g. Languages)" value={sk.label} onChange={(e) => patchLabel(sk.id, e.target.value)} />
            <Input
              placeholder="Comma-separated skills (e.g. Python, TypeScript, Go)"
              value={sk.items.join(', ')}
              onChange={(e) => patchItems(sk.id, e.target.value)}
            />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add skill category
      </Button>
    </div>
  )
}
