
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useContent } from '@/hooks/useContent';
import { CategoryList } from './CategoryList';
import { CalendarHeader } from './CalendarHeader';

export function ContentCalendar() {
  const { 
    categories, 
    topics, 
    isLoading,
    addCategory,
    editCategory,
    removeCategory,
    addTopic,
    editTopic,
    toggleTopicCompletion,
    removeTopic,
    moveTopic
  } = useContent();

  const handleAddCategory = async (name: string) => {
    await addCategory(name);
  };

  const handleEditCategory = async (id: string, name: string) => {
    await editCategory(id, name);
  };

  const handleDeleteCategory = async (id: string) => {
    await removeCategory(id);
  };

  const handleAddTopic = async (categoryId: string, title: string) => {
    await addTopic(categoryId, title);
  };

  const handleEditTopic = async (id: string, title: string) => {
    await editTopic(id, title);
  };

  const handleDeleteTopic = async (id: string) => {
    await removeTopic(id);
  };

  const handleToggleComplete = async (id: string) => {
    await toggleTopicCompletion(id);
  };

  const handleMoveTopic = async (id: string, targetCategoryId: string, order: number) => {
    await moveTopic(id, targetCategoryId, order);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-medium">Loading your content...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <CalendarHeader onAddCategory={handleAddCategory} />
        
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-xl font-medium mb-4">No categories yet</p>
            <button
              onClick={() => handleAddCategory('General')}
              className="text-primary hover:underline"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {categories.map((category) => (
              <CategoryList
                key={category.id}
                category={category}
                topics={topics}
                allCategories={categories}
                onAddTopic={handleAddTopic}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
                onToggleComplete={handleToggleComplete}
                onMoveTopic={handleMoveTopic}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            ))}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
