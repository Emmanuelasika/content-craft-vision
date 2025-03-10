
import { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Category, Topic } from '@/lib/supabase';
import { ItemTypes } from '@/lib/dnd';
import { TopicItem } from './TopicItem';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Edit, Trash, ListChecks } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog';
import { CategoryDialog } from '../dialogs/CategoryDialog';
import { TopicDialog } from '../dialogs/TopicDialog';

interface CategoryListProps {
  category: Category;
  topics: Topic[];
  allCategories: Category[];
  onAddTopic: (categoryId: string, title: string) => Promise<void>;
  onEditTopic: (id: string, title: string) => Promise<void>;
  onDeleteTopic: (id: string) => Promise<void>;
  onToggleComplete: (id: string) => Promise<void>;
  onMoveTopic: (id: string, targetCategoryId: string, order: number) => Promise<void>;
  onEditCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

// Function to get a color based on category name
const getCategoryColor = (name: string) => {
  const colors = [
    'from-violet-400 to-purple-500',
    'from-blue-400 to-cyan-500',
    'from-green-400 to-emerald-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-indigo-400 to-blue-500',
  ];
  
  // Use the sum of character codes to create a deterministic index
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
};

export function CategoryList({
  category,
  topics,
  allCategories,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onToggleComplete,
  onMoveTopic,
  onEditCategory,
  onDeleteCategory,
}: CategoryListProps) {
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);

  const filteredTopics = topics
    .filter(topic => topic.category_id === category.id)
    .sort((a, b) => {
      // Sort by completion status first (completed on top)
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      // Then sort by order
      return a.order - b.order;
    });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TOPIC,
    drop: (item: { id: string; type: string }, monitor) => {
      // If dropped directly on the category (not on a specific topic)
      if (monitor.didDrop()) {
        return;
      }
      
      // Add to the end of this category
      return {
        categoryId: category.id,
        index: filteredTopics.length
      };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true })
    })
  });

  const handleAddTopic = async (title: string, categoryId: string) => {
    await onAddTopic(categoryId, title);
  };

  const handleEditTopic = async (title: string) => {
    if (editingTopic) {
      await onEditTopic(editingTopic.id, title);
      setEditingTopic(null);
    }
  };

  const handleDeleteTopic = async () => {
    if (deletingTopic) {
      await onDeleteTopic(deletingTopic.id);
      setDeletingTopic(null);
    }
  };

  const handleEditCategory = async (name: string) => {
    await onEditCategory(category.id, name);
  };

  const handleDeleteCategory = async () => {
    await onDeleteCategory(category.id);
  };

  // Don't allow deleting the General category
  const isGeneral = category.name === 'General';
  const categoryGradient = getCategoryColor(category.name);
  const completedCount = filteredTopics.filter(t => t.completed).length;
  const totalCount = filteredTopics.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div 
      className={`rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${isOver ? 'ring-2 ring-purple-400 ring-opacity-60' : ''}`} 
      ref={drop}
    >
      {/* Category Header with Gradient */}
      <div className={`bg-gradient-to-r ${categoryGradient} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg tracking-tight">{category.name}</h3>
          
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAddTopicOpen(true)}
              className="h-8 w-8 rounded-full text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-white/20">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditCategoryOpen(true)} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4 text-purple-500" />
                  Edit Category
                </DropdownMenuItem>
                {!isGeneral && (
                  <DropdownMenuItem
                    onClick={() => setIsDeleteCategoryOpen(true)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Category
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-2 pt-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/90">{completedCount} of {totalCount} completed</span>
              <span className="font-medium">{Math.round(completionPercentage)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Topics List */}
      <div className="p-4">
        {filteredTopics.length > 0 ? (
          <div className="space-y-2">
            {filteredTopics.map((topic, index) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                onToggleComplete={onToggleComplete}
                onEdit={setEditingTopic}
                onDelete={setDeletingTopic}
                onMove={onMoveTopic}
                categoryId={category.id}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <ListChecks className="h-8 w-8 mb-2 text-muted-foreground/50" />
            <p className="mb-2">No topics yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddTopicOpen(true)}
              className="rounded-full text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add topic
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TopicDialog
        isOpen={isAddTopicOpen}
        onClose={() => setIsAddTopicOpen(false)}
        onSubmit={handleAddTopic}
        title="Add Topic"
        description="Add a new topic to this category"
        confirmText="Add Topic"
        initialCategoryId={category.id}
        categories={allCategories}
      />
      
      <TopicDialog
        isOpen={!!editingTopic}
        onClose={() => setEditingTopic(null)}
        onSubmit={handleEditTopic}
        title="Edit Topic"
        description="Update the topic details"
        confirmText="Save Changes"
        initialValue={editingTopic?.title}
        initialCategoryId={editingTopic?.category_id}
        categories={allCategories}
        editMode={true}
      />
      
      <DeleteConfirmDialog
        isOpen={!!deletingTopic}
        onClose={() => setDeletingTopic(null)}
        onConfirm={handleDeleteTopic}
        title="Delete Topic"
        description="Are you sure you want to delete this topic? This action cannot be undone."
      />
      
      <CategoryDialog
        isOpen={isEditCategoryOpen}
        onClose={() => setIsEditCategoryOpen(false)}
        onSubmit={handleEditCategory}
        title="Edit Category"
        description="Update the category name"
        confirmText="Save Changes"
        initialValue={category.name}
      />
      
      <DeleteConfirmDialog
        isOpen={isDeleteCategoryOpen}
        onClose={() => setIsDeleteCategoryOpen(false)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        description="Are you sure you want to delete this category? All topics will be moved to General. This action cannot be undone."
      />
    </div>
  );
}
