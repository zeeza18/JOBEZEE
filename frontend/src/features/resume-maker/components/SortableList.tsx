import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'

function SortableItem({ id, onRemove, children }: { id: string; onRemove?: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3', isDragging && 'opacity-50')}
    >
      <button
        {...attributes} {...listeners} type="button"
        className="mt-1 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-2">{children}</div>
      {onRemove && (
        <button onClick={onRemove} type="button" className="mt-1 text-slate-400 hover:text-red-500" title="Remove">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function SortableList<T extends { id: string }>({
  items, onReorder, renderItem, onRemove, emptyLabel,
}: {
  items: T[]
  onReorder: (next: T[]) => void
  renderItem: (item: T, index: number) => React.ReactNode
  onRemove?: (id: string) => void
  emptyLabel?: string
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  if (items.length === 0 && emptyLabel) {
    return <p className="text-xs text-slate-400 italic">{emptyLabel}</p>
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <SortableItem key={item.id} id={item.id} onRemove={onRemove ? () => onRemove(item.id) : undefined}>
              {renderItem(item, idx)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
