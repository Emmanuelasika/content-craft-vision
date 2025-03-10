
import { useState } from 'react';
import { useDrop } from 'react-dnd';
import { Category, Topic } from '@/lib/supabase';
import { ItemTypes } from '@/lib/dnd';
import { TopicItem } from './TopicItem';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Edit, Trash } from 'lucide-react';
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

  const [, drop] = useDrop({
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

  return (
    <div className="category-card group animate-fade-in" ref={drop}>
      <div className="flex items-center justify-between">
        <h3 className="category-title">{category.name}</h3>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAddTopicOpen(true)}
            className="h-8 w-8 rounded-full"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditCategoryOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!isGeneral && (
                <DropdownMenuItem
                  onClick={() => setIsDeleteCategoryOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {filteredTopics.length > 0 ? (
        <div className="topic-list">
          {filteredTopics.map((topic, index) => (
            <div key={topic.id} className="group">
              <TopicItem
                topic={topic}
                onToggleComplete={onToggleComplete}
                onEdit={setEditingTopic}
                onDelete={setDeletingTopic}
                onMove={onMoveTopic}
                categoryId={category.id}
                index={index}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground italic">
          No topics in this category
        </div>
      )}

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
