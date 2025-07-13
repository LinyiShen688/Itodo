'use client';

import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';

export default function DragContext({ children, onDragEnd }) {
  const [activeId, setActiveId] = useState(null);
  
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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    document.body.classList.add('dragging-active');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // 如果拖拽到了不同的位置
    if (active.id !== over.id) {
      onDragEnd && onDragEnd(event);
    }
    
    setActiveId(null);
    document.body.classList.remove('dragging-active');
  };

  const handleDragCancel = () => {
    setActiveId(null);
    document.body.classList.remove('dragging-active');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeId ? (
          <div
            className="pointer-events-none select-none rounded-xl bg-[rgba(255,255,255,0.8)] px-4 py-3 text-sm text-[var(--ink-black)] shadow-lg opacity-50 transform scale-95"
          >
            正在拖拽...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
} 