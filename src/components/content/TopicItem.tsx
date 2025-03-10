
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';
import { ItemTypes } from '@/lib/dnd';
import { Topic } from '@/lib/supabase';
import { Check, Trash, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode } from './CalendarHeader';

interface TopicItemProps {
  topic: Topic;
  onToggleComplete: (id: string) => Promise<void>;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
  onMove: (id: string, targetCategoryId: string, order: number) => Promise<void>;
  categoryId: string;
  index: number;
  viewMode: ViewMode;
}

interface DragItem {
  id: string;
  type: string;
  originalIndex: number;
  originalCategoryId: string;
}

interface DropResult {
  isOver: boolean;
}

export function TopicItem({
  topic,
  onToggleComplete,
  onEdit,
  onDelete,
  onMove,
  categoryId,
  index,
  viewMode
}: TopicItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.TOPIC,
    item: { 
      id: topic.id, 
      type: ItemTypes.TOPIC,
      originalIndex: index,
      originalCategoryId: topic.category_id
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ 
        categoryId: string; 
        index: number;
      }>();
      
      if (item && dropResult) {
        onMove(item.id, dropResult.categoryId, dropResult.index);
      }
    },
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, DropResult>({
    accept: ItemTypes.TOPIC,
    hover: (draggedItem, monitor) => {
      if (!ref.current) return;
      
      const draggedIndex = draggedItem.originalIndex;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (draggedItem.id === topic.id) {
        return;
      }
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // Dragging downwards
      if (draggedIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (draggedIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Time to actually perform the action
      draggedItem.originalIndex = hoverIndex;
      draggedItem.originalCategoryId = categoryId;
    },
    drop: () => ({ categoryId, index }),
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true })
    })
  });
  
  drag(drop(ref));
  
  return (
    <div
      ref={preview}
      className={cn(
        'task-item group draggable-item rounded-lg border p-2 transition-all duration-200',
        isOver && 'ring-2 ring-purple-400 ring-opacity-60',
        isDragging && 'opacity-50 shadow-lg',
        topic.completed && 'completed bg-purple-50 dark:bg-purple-900/10',
        viewMode === 'grid' ? 'rounded-lg shadow-sm' : ''
      )}
      style={{ 
        opacity: isDragging ? 0.3 : 1,
        boxShadow: isOver ? '0 0 0 2px rgba(139, 92, 246, 0.3)' : 'none'
      }}
    >
      <div className="flex items-center gap-2">
        <div ref={ref} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleComplete(topic.id)}
          className={cn(
            "h-6 w-6 rounded-full border",
            topic.completed 
              ? "bg-primary border-primary text-primary-foreground" 
              : "border-muted-foreground/20"
          )}
        >
          {topic.completed && <Check className="h-3 w-3" />}
        </Button>
        
        <div 
          className={cn(
            "flex-1 text-sm",
            topic.completed ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {topic.title}
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(topic)}
            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-secondary-foreground transition-opacity"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(topic)}
            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Show ghost image during drag */}
      {isDragging && (
        <div 
          className="fixed pointer-events-none bg-white dark:bg-gray-800 border rounded-lg p-2 opacity-80 shadow-lg z-50 max-w-xs" 
          style={{ 
            left: '-1000px', 
            top: '-1000px'
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full border border-purple-300"></div>
            <div className="flex-1 text-sm truncate">{topic.title}</div>
          </div>
        </div>
      )}
    </div>
  );
}
