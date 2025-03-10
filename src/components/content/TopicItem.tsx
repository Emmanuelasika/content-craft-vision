
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { cn } from '@/lib/utils';
import { ItemTypes } from '@/lib/dnd';
import { Topic } from '@/lib/supabase';
import { Check, Trash, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopicItemProps {
  topic: Topic;
  onToggleComplete: (id: string) => Promise<void>;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
  onMove: (id: string, targetCategoryId: string, order: number) => Promise<void>;
  categoryId: string;
  index: number;
}

interface DragItem {
  id: string;
  type: string;
  originalIndex: number;
  originalCategoryId: string;
}

export function TopicItem({
  topic,
  onToggleComplete,
  onEdit,
  onDelete,
  onMove,
  categoryId,
  index
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

  const [, drop] = useDrop<DragItem>({
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
  });
  
  drag(drop(ref));
  
  return (
    <div
      ref={preview}
      className={cn(
        'task-item draggable-item',
        isDragging && 'opacity-50',
        topic.completed && 'completed'
      )}
      style={{ opacity: isDragging ? 0.5 : 1 }}
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
    </div>
  );
}
