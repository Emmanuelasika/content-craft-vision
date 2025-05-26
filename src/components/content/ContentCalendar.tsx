
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useContent } from '@/hooks/useContent';
import { CategoryList } from './CategoryList';
import { CalendarHeader, ViewMode, SortOption } from './CalendarHeader';
import { toast } from 'sonner';
import { useEffect, useState, useMemo } from 'react';

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
    moveTopic,
    refresh,
    reorderCategories
  } = useContent();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOption, setSortOption] = useState<SortOption>('dateAdded');

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

  const handleReorderCategories = async (categoryId: string, newOrder: number) => {
    const reorderedIds = [...categories].sort((a, b) => a.order - b.order);
    
    // Remove the category from its current position
    const targetCategory = reorderedIds.find(c => c.id === categoryId);
    if (!targetCategory) return;
    
    const oldIndex = reorderedIds.indexOf(targetCategory);
    reorderedIds.splice(oldIndex, 1);
    
    // Insert at new position
    reorderedIds.splice(newOrder, 0, targetCategory);
    
    // Update the order
    const categoryIdsInOrder = reorderedIds.map(c => c.id);
    await reorderCategories(categoryIdsInOrder);
  };

  // Sort topics based on selected option
  const sortedTopics = useMemo(() => {
    if (sortOption === 'alphabetical') {
      return [...topics].sort((a, b) => a.title.localeCompare(b.title));
    }
    // Default is by date added (using order field, which is maintained by other functions)
    // Or if sortOption === 'dateAdded' (explicitly)
    return topics; // Assuming topics are already generally in order or will be sorted by category logic
  }, [topics, sortOption]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-medium bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">Loading your content...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <CalendarHeader 
          onAddCategory={handleAddCategory} 
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
        />
        
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 my-8 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-list"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>
            </div>
            <p className="text-xl font-medium bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent mb-4">Start organizing your content</p>
            <button
              onClick={() => handleAddCategory('General')}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "mt-6 space-y-6"
          }>
            {categories.map((category, index) => (
              <CategoryList
                key={category.id}
                category={category}
                topics={sortedTopics}
                allCategories={categories}
                onAddTopic={handleAddTopic}
                onEditTopic={handleEditTopic}
                onDeleteTopic={handleDeleteTopic}
                onToggleComplete={handleToggleComplete}
                onMoveTopic={handleMoveTopic}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
                onReorderCategory={handleReorderCategories}
                viewMode={viewMode}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
