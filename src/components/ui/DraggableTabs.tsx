// Draggable Tabs Component - Reorderable tab navigation
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortableTabProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}

function SortableTab({ tab, isActive, onClick }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 group',
        isDragging && 'z-50 opacity-80'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
          'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800',
          'focus:outline-none focus:opacity-100'
        )}
        aria-label={`Drag to reorder ${tab.label}`}
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Tab Button */}
      <button
        onClick={onClick}
        className={cn(
          'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-zinc-950',
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
        )}
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${tab.id}`}
        id={`tab-${tab.id}`}
      >
        <span className="flex items-center gap-2">
          {tab.icon}
          {tab.label}
        </span>
      </button>
    </div>
  );
}

interface DraggableTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabsReorder: (tabs: Tab[]) => void;
  className?: string;
}

export function DraggableTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabsReorder,
  className,
}: DraggableTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      const newTabs = arrayMove(tabs, oldIndex, newIndex);
      onTabsReorder(newTabs);
    }
  };

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="tablist"
      aria-label="Navigation tabs"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Storage key for persisting tab order
const TAB_ORDER_KEY = 'terminal-zero-tab-order';

export function saveTabOrder(tabs: Tab[]) {
  localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(tabs.map((t) => t.id)));
}

export function loadTabOrder(defaultTabs: Tab[]): Tab[] {
  const stored = localStorage.getItem(TAB_ORDER_KEY);
  if (!stored) return defaultTabs;

  try {
    const order = JSON.parse(stored) as string[];
    const orderedTabs: Tab[] = [];

    // Reorder based on stored order
    for (const id of order) {
      const tab = defaultTabs.find((t) => t.id === id);
      if (tab) orderedTabs.push(tab);
    }

    // Add any new tabs that weren't in storage
    for (const tab of defaultTabs) {
      if (!orderedTabs.find((t) => t.id === tab.id)) {
        orderedTabs.push(tab);
      }
    }

    return orderedTabs;
  } catch {
    return defaultTabs;
  }
}
