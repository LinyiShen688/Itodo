'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';

export default function DraggableTaskItem({
  task,
  quadrantId,
  onUpdate,
  onDelete,
  onToggleComplete,
  onUpdateText,
  showETA = true
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'transition-transform duration-150 ease-in-out' : ''}
      {...attributes}
    >
      <TaskItem
        task={task}
        quadrantId={quadrantId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
        onUpdateText={onUpdateText}
        dragListeners={listeners}
        setActivatorNodeRef={setActivatorNodeRef}
        showETA={showETA}
      />
    </div>
  );
} 