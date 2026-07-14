import { Plus } from 'lucide-react'
import { Input } from '../../../../components/ui/Input'
import { Button } from '../../../../components/ui/Button'
import { useResumeMaker } from '../../store/useResumeMaker'
import { genId } from '../../lib/genId'
import { SortableList } from '../SortableList'
import { BulletListEditor } from '../BulletListEditor'

export function CustomSectionsForm() {
  const { content, updateContent } = useResumeMaker()

  const patchTitle = (id: string, title: string) =>
    updateContent((prev) => ({ ...prev, custom: prev.custom.map((s) => (s.id === id ? { ...s, title } : s)) }))

  const patchItems = (id: string, items: string[]) =>
    updateContent((prev) => ({ ...prev, custom: prev.custom.map((s) => (s.id === id ? { ...s, items } : s)) }))

  const add = () =>
    updateContent((prev) => ({
      ...prev,
      custom: [...prev.custom, { id: genId('custom'), title: 'New Section', items: [] }],
    }))

  const remove = (id: string) =>
    updateContent((prev) => ({ ...prev, custom: prev.custom.filter((s) => s.id !== id) }))

  return (
    <div className="space-y-3">
      <SortableList
        items={content.custom}
        onReorder={(next) => updateContent((prev) => ({ ...prev, custom: next }))}
        onRemove={remove}
        emptyLabel="No custom sections yet — e.g. Awards, Publications, Volunteering."
        renderItem={(section) => (
          <div className="space-y-2">
            <Input placeholder="Section title" value={section.title} onChange={(e) => patchTitle(section.id, e.target.value)} />
            <BulletListEditor bullets={section.items} onChange={(items) => patchItems(section.id, items)} />
          </div>
        )}
      />
      <Button type="button" variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>
        Add custom section
      </Button>
    </div>
  )
}
