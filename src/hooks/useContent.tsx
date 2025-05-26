
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  getCategories, 
  getTopics, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  createTopic,
  updateTopic,
  deleteTopic,
  updateTopicsOrder,
  updateCategoriesOrder,
  Category,
  Topic
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useContent = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setCategories([]);
      setTopics([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [categoriesResponse, topicsResponse] = await Promise.all([
        getCategories(user.id),
        getTopics(user.id)
      ]);
      
      if (categoriesResponse.error) throw categoriesResponse.error;
      if (topicsResponse.error) throw topicsResponse.error;
      
      const fetchedCategories = categoriesResponse.data || [];
      
      // Ensure there's a General category
      if (fetchedCategories.length === 0 || !fetchedCategories.some(cat => cat.name === 'General')) {
        let generalOrder = 0;
        const updatesForExistingCategories: { id: string, order: number }[] = [];

        if (fetchedCategories.length > 0) {
          // Check if order 0 is taken by another category
          const categoryAtOrderZero = fetchedCategories.find(cat => cat.order === 0);
          if (categoryAtOrderZero) {
            // If order 0 is taken, shift other categories
            fetchedCategories.sort((a,b) => a.order - b.order); // Ensure correct order before shifting
            
            let currentOrderToAssign = 1; // Start assigning from 1 for existing categories
            for (const cat of fetchedCategories) {
              if (cat.order < currentOrderToAssign) { 
                // This category is before the new "General" or its new position
                // and its order doesn't need to change relative to "General" being 0.
                // However, if we are re-assigning all orders to be sequential:
                 if (cat.order !== currentOrderToAssign -1 && cat.order !==0) { // if cat.order was not 0
                    // This case is tricky: if categories are like 0, 2, 3 and General becomes 0.
                    // The original 0 becomes 1, 2 becomes 2, 3 becomes 3.
                    // Let's simplify: shift all existing categories by 1 if 0 is taken.
                 }
              }
              // This simplified logic shifts all existing categories one position down
              // if the 'General' category is to be inserted at order 0.
            }

            // Shift all existing categories to make space for "General" at order 0
            fetchedCategories.forEach(cat => {
              updatesForExistingCategories.push({ id: cat.id, order: cat.order + 1 });
            });
          }
          // If order 0 is not taken, generalOrder remains 0, and no shifts are needed yet.
        }
        
        // Create the "General" category with the determined order
        const { data: generalData, error: generalError } = await createCategory(
          user.id, 
          'General', 
          generalOrder 
        );
        
        if (generalError) throw generalError;
        if (generalData && generalData[0]) {
          fetchedCategories.push(generalData[0]);

          // If other categories were shifted, update them in the database
          if (updatesForExistingCategories.length > 0) {
            await updateCategoriesOrder(updatesForExistingCategories);
            // Update local state for these categories as well
            fetchedCategories = fetchedCategories.map(cat => {
              const update = updatesForExistingCategories.find(u => u.id === cat.id);
              return update ? { ...cat, order: update.order } : cat;
            }).filter(cat => cat.id !== generalData[0].id); // remove the one we pushed, it will be added back
            fetchedCategories.push(generalData[0]); // Add the newly created General category
          }
        }
      }
      
      // Sort categories by order to ensure consistency before setting state
      const sortedCategories = [...fetchedCategories].sort((a, b) => a.order - b.order);
      setCategories(sortedCategories);
      setTopics(topicsResponse.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load content');
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addCategory = async (name: string) => {
    if (!user) return null;

    // Check for duplicate "General" category
    if (name === 'General') {
      const existingGeneralCategory = categories.find(cat => cat.name === 'General');
      if (existingGeneralCategory) {
        toast.info("A 'General' category already exists.");
        return null;
      }
    }
    
    try {
      const { data, error } = await createCategory(user.id, name, categories.length);
      if (error) throw error;
      
      if (data && data[0]) {
        setCategories([...categories, data[0]]);
        toast.success(`Category "${name}" created`);
        return data[0];
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category');
      console.error('Error creating category:', error);
      return null;
    }
  };

  const editCategory = async (id: string, name: string) => {
    try {
      const { data, error } = await updateCategory(id, { name });
      if (error) throw error;
      
      if (data && data[0]) {
        setCategories(categories.map(cat => 
          cat.id === id ? { ...cat, name } : cat
        ));
        toast.success(`Category renamed to "${name}"`);
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update category');
      console.error('Error updating category:', error);
      return false;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      // Find the General category to move topics
      const generalCategory = categories.find(cat => cat.name === 'General');
      
      if (!generalCategory) {
        console.error("Critical: General category not found during category deletion process.");
        toast.error('Cannot delete category: General category not found');
        return false;
      }
      
      // Don't allow deleting the General category
      if (id === generalCategory.id) {
        toast.error('Cannot delete the General category');
        return false;
      }
      
      const { error } = await deleteCategory(id);
      if (error) throw error;
      
      // Update topics in state
      setTopics(topics.map(topic => 
        topic.category_id === id 
          ? { ...topic, category_id: generalCategory.id } 
          : topic
      ));
      
      // Update categories in state
      const updatedCategories = categories.filter(cat => cat.id !== id);
      
      // Reorder remaining categories
      const reorderedCategories = updatedCategories.map((cat, index) => ({
        ...cat,
        order: index
      }));
      
      setCategories(reorderedCategories);
      
      // Update orders in database
      await updateCategoriesOrder(
        reorderedCategories.map((cat, index) => ({ id: cat.id, order: index }))
      );
      
      toast.success('Category deleted');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
      console.error('Error deleting category:', error);
      return false;
    }
  };

  const addTopic = async (categoryId: string, title: string) => {
    if (!user) return null;
    
    try {
      // Count existing topics in this category to determine order
      const categoryTopics = topics.filter(t => t.category_id === categoryId);
      const order = categoryTopics.length;
      
      const { data, error } = await createTopic(user.id, categoryId, title, order);
      if (error) throw error;
      
      if (data && data[0]) {
        setTopics([...topics, data[0]]);
        toast.success('Topic added');
        return data[0];
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add topic');
      console.error('Error adding topic:', error);
      return null;
    }
  };

  const editTopic = async (id: string, title: string) => {
    try {
      const { data, error } = await updateTopic(id, { title });
      if (error) throw error;
      
      if (data && data[0]) {
        setTopics(topics.map(topic => 
          topic.id === id ? { ...topic, title } : topic
        ));
        toast.success('Topic updated');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update topic');
      console.error('Error updating topic:', error);
      return false;
    }
  };

  const toggleTopicCompletion = async (id: string) => {
    try {
      const topic = topics.find(t => t.id === id);
      if (!topic) return false;
      
      // 1. Update the topic's completed status
      const newCompletedStatus = !topic.completed;
      
      // Update in DB
      const { data, error } = await updateTopic(id, { 
        completed: newCompletedStatus 
      });
      
      if (error) throw error;
      
      if (data && data[0]) {
        // 2. Update local state with the new completed status immediately
        let updatedTopics = topics.map(t => 
          t.id === id ? { ...t, completed: newCompletedStatus } : t
        );
        
        // 3. If the topic is marked as completed, re-sort topics within its category
        if (newCompletedStatus) {
          // Get all topics belonging to the same category as the current topic
          const categoryTopics = updatedTopics.filter(t => t.category_id === topic.category_id);
          // Get all topics not belonging to this category (to be preserved)
          const otherCategoryTopics = updatedTopics.filter(t => t.category_id !== topic.category_id);
          
          // 3a. Sort completed topics to the top, then by their original order.
          // This maintains a stable sort for incomplete items and newly completed items.
          const sortedCategoryTopics = categoryTopics.sort((a, b) => {
            if (a.completed && !b.completed) return -1; // a (completed) comes before b (incomplete)
            if (!a.completed && b.completed) return 1;  // b (completed) comes before a (incomplete)
            return a.order - b.order; // Otherwise, maintain original order
          });
          
          // 3b. Re-assign orders based on the new sort for database update
          const topicsToUpdateInDb = sortedCategoryTopics.map((t, index) => ({
            id: t.id,
            order: index // New order within the category
          }));
          
          // 3c. Update database with new orders for the affected topics
          if (topicsToUpdateInDb.length > 0) {
            await updateTopicsOrder(topicsToUpdateInDb);
          }
          
          // 3d. Update local state: merge sorted category topics with other topics.
          // Also, ensure their 'order' property reflects the new sorting for consistency in the local state.
          updatedTopics = [
            ...sortedCategoryTopics.map((t, index) => ({ ...t, order: index })), // Apply new order to state
            ...otherCategoryTopics
          ];
        }
        // If a topic is marked incomplete, its order doesn't change relative to others in this step,
        // but its completed status is updated. Future sorts (e.g. view mode changes) will place it accordingly.

        // 4. Update the main topics state with all changes
        setTopics(updatedTopics);
        
        toast.success(newCompletedStatus ? 'Topic marked as completed' : 'Topic marked as active');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update topic status');
      console.error('Error updating topic status:', error);
      return false;
    }
  };

  const removeTopic = async (id: string) => {
    try {
      const { error } = await deleteTopic(id);
      if (error) throw error;
      
      const topicToDelete = topics.find(t => t.id === id);
      if (!topicToDelete) return false;
      
      // Filter out the deleted topic
      const filteredTopics = topics.filter(t => t.id !== id);
      
      // Reorder topics in the same category
      const categoryTopics = filteredTopics
        .filter(t => t.category_id === topicToDelete.category_id)
        .sort((a, b) => a.order - b.order);
      
      const topicsToUpdate = categoryTopics.map((t, index) => ({
        id: t.id,
        order: index
      }));
      
      // Update database with new orders
      if (topicsToUpdate.length > 0) {
        await updateTopicsOrder(topicsToUpdate);
      }
      
      // Update state
      const updatedTopics = filteredTopics.map(t => {
        if (t.category_id === topicToDelete.category_id) {
          const newOrder = categoryTopics.findIndex(ct => ct.id === t.id);
          return { ...t, order: newOrder };
        }
        return t;
      });
      
      setTopics(updatedTopics);
      toast.success('Topic removed');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove topic');
      console.error('Error removing topic:', error);
      return false;
    }
  };

  const moveTopic = async (topicId: string, targetCategoryId: string, newOrder: number) => {
    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return false;
      
      // Skip if no change
      if (topic.category_id === targetCategoryId && topic.order === newOrder) {
        return true;
      }
      
      const { data, error } = await updateTopic(topicId, { 
        category_id: targetCategoryId,
        order: newOrder
      });
      
      if (error) throw error;
      
      if (data && data[0]) {
        // 1. The `updateTopic` call already updated the moved topic's category_id and order in the database.
        //    Reflect this change immediately in the local state for the moved topic.
        let currentTopics = topics.map(t => 
          t.id === topicId 
            ? { ...t, category_id: targetCategoryId, order: newOrder } 
            : t
        );

        // Prepare a list of topics whose orders need to be updated in the database.
        // Start with the moved topic itself, as its `category_id` also changed.
        const dbUpdates = [{ id: topicId, order: newOrder, category_id: targetCategoryId }];

        // 2. Re-calculate and update orders for topics in the SOURCE category.
        //    This is only necessary if the topic moved to a *different* category.
        if (topic.category_id !== targetCategoryId) {
          const sourceCategoryTopics = currentTopics
            .filter(t => t.category_id === topic.category_id && t.id !== topicId) // Exclude the moved topic
            .sort((a, b) => a.order - b.order); // Sort by current order to correctly re-index

          sourceCategoryTopics.forEach((t, index) => {
            // If the topic's current order in the sorted list is different from its stored order, it needs an update.
            if (t.order !== index) { 
              currentTopics = currentTopics.map(ct => ct.id === t.id ? { ...ct, order: index } : ct);
              dbUpdates.push({ id: t.id, order: index, category_id: t.category_id });
            }
          });
        }

        // 3. Re-calculate and update orders for topics in the TARGET category.
        //    Get all topics currently in the target category, excluding the (just moved) topic.
        let targetCategoryTopics = currentTopics
          .filter(t => t.category_id === targetCategoryId && t.id !== topicId)
          .sort((a, b) => a.order - b.order); // Sort them by their current order.

        // Insert the moved topic into this sorted list at its `newOrder` position.
        // This creates a conceptual snapshot of how the target category should look.
        const movedTopicInTarget = currentTopics.find(t => t.id === topicId)!;
        targetCategoryTopics.splice(newOrder, 0, movedTopicInTarget);

        // Now, iterate through this conceptual list and update orders in `currentTopics` and `dbUpdates`.
        targetCategoryTopics.forEach((t, index) => {
          // If a topic's order in this conceptual list is different from its stored order, it needs an update.
          if (t.order !== index) {
            currentTopics = currentTopics.map(ct => ct.id === t.id ? { ...ct, order: index } : ct);
            // Check if this topic is already in dbUpdates to avoid duplicates (e.g., the moved topic itself)
            const existingUpdate = dbUpdates.find(upd => upd.id === t.id);
            if (existingUpdate) {
              existingUpdate.order = index; // Update existing entry
            } else {
              dbUpdates.push({ id: t.id, order: index, category_id: t.category_id });
            }
          }
        });
        
        // 4. Update database with all necessary order changes.
        //    Filter out updates where the new order is the same as the old one AND category_id is the same.
        //    This avoids redundant database operations.
        const filteredDbUpdates = dbUpdates.filter(update => {
            const originalTopic = topics.find(t => t.id === update.id);
            if (!originalTopic) return true; // Should not happen if logic is correct
            return originalTopic.order !== update.order || (update.category_id && originalTopic.category_id !== update.category_id);
        });

        if (filteredDbUpdates.length > 0) {
            await updateTopicsOrder(filteredDbUpdates);
        }
        
        // 5. Update local state with all changes.
        //    The `currentTopics` array now has all topics with their correct orders and category_ids.
        //    Sort the entire `currentTopics` array for display: first by category order (if applicable, not done here),
        //    then by topic order within each category. This ensures the UI reflects the new state accurately.
        setTopics(
          currentTopics.sort((a, b) => {
            if (a.category_id === b.category_id) {
              return a.order - b.order;
            }
            // Optional: A secondary sort for categories themselves, if they are not already ordered.
            // For now, topics are grouped by category_id, and then ordered within that group.
            // This relies on categories being inherently ordered or sorted elsewhere if cross-category display order matters.
            return (categories.find(c => c.id === a.category_id)?.order ?? 0) - (categories.find(c => c.id === b.category_id)?.order ?? 0);
          })
        );
        toast.success('Topic moved');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to move topic');
      console.error('Error moving topic:', error);
      return false;
    }
  };

  const reorderTopics = async (categoryId: string, reorderedTopicIds: string[]) => {
    try {
      // Create updates for the database
      const topicsToUpdate = reorderedTopicIds.map((id, index) => ({
        id,
        order: index
      }));
      
      // Update database
      const { error } = await updateTopicsOrder(topicsToUpdate);
      if (error) throw error;
      
      // Update state
      setTopics(topics.map(topic => {
        const index = reorderedTopicIds.indexOf(topic.id);
        if (index !== -1) {
          return { ...topic, order: index };
        }
        return topic;
      }));
      
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder topics');
      console.error('Error reordering topics:', error);
      return false;
    }
  };

  const reorderCategories = async (reorderedCategoryIds: string[]) => {
    try {
      // Create updates for the database
      const categoriesToUpdate = reorderedCategoryIds.map((id, index) => ({
        id,
        order: index
      }));
      
      // Update database
      const { error } = await updateCategoriesOrder(categoriesToUpdate);
      if (error) throw error;
      
      // Update state
      setCategories(
        categories
          .map(category => {
            const index = reorderedCategoryIds.indexOf(category.id);
            if (index !== -1) {
              return { ...category, order: index };
            }
            return category;
          })
          .sort((a, b) => a.order - b.order)
      );
      
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder categories');
      console.error('Error reordering categories:', error);
      return false;
    }
  };

  return {
    categories,
    topics,
    isLoading,
    refresh: fetchData,
    addCategory,
    editCategory,
    removeCategory,
    addTopic,
    editTopic,
    toggleTopicCompletion,
    removeTopic,
    moveTopic,
    reorderTopics,
    reorderCategories
  };
};
