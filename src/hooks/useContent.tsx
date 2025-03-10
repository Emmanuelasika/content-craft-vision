
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
        const { data, error } = await createCategory(
          user.id, 
          'General', 
          fetchedCategories.length
        );
        
        if (error) throw error;
        if (data) fetchedCategories.push(data[0]);
      }
      
      // Sort categories by order
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
      
      const newCompletedStatus = !topic.completed;
      
      const { data, error } = await updateTopic(id, { 
        completed: newCompletedStatus 
      });
      
      if (error) throw error;
      
      if (data && data[0]) {
        // Update state with the completed status
        const updatedTopics = topics.map(t => 
          t.id === id ? { ...t, completed: newCompletedStatus } : t
        );
        
        // If completed, move to top of category
        if (newCompletedStatus) {
          const categoryTopics = updatedTopics.filter(t => t.category_id === topic.category_id);
          const otherCategoryTopics = updatedTopics.filter(t => t.category_id !== topic.category_id);
          
          // Sort completed to top, then by original order
          const sortedCategoryTopics = categoryTopics.sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            return a.order - b.order;
          });
          
          // Reassign orders
          const topicsToUpdate = sortedCategoryTopics.map((t, index) => ({
            id: t.id,
            order: index
          }));
          
          // Update database with new orders
          await updateTopicsOrder(topicsToUpdate);
          
          // Update state with new orders
          const finalTopics = [
            ...sortedCategoryTopics.map((t, index) => ({ ...t, order: index })),
            ...otherCategoryTopics
          ];
          
          setTopics(finalTopics);
        } else {
          setTopics(updatedTopics);
        }
        
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
        // First update the moved topic in state
        const updatedTopics = topics.map(t => 
          t.id === topicId 
            ? { ...t, category_id: targetCategoryId, order: newOrder } 
            : t
        );
        
        // Now shift other topics in both source and target categories
        const sourceTopics = updatedTopics
          .filter(t => t.category_id === topic.category_id && t.id !== topicId)
          .sort((a, b) => a.order - b.order);
          
        const targetTopics = updatedTopics
          .filter(t => t.category_id === targetCategoryId && t.id !== topicId)
          .sort((a, b) => a.order - b.order);
        
        // Update orders for source category
        const updatedSourceTopics = sourceTopics.map((t, index) => ({
          ...t,
          order: index
        }));
        
        // Update orders for target category, accounting for the inserted item
        const updatedTargetTopics = [];
        for (let i = 0; i < targetTopics.length; i++) {
          if (i < newOrder) {
            updatedTargetTopics.push({ ...targetTopics[i], order: i });
          } else {
            updatedTargetTopics.push({ ...targetTopics[i], order: i + 1 });
          }
        }
        
        // Combine all topics with updated orders
        const finalTopics = updatedTopics.map(t => {
          if (t.id === topicId) {
            return { ...t, order: newOrder };
          }
          
          if (t.category_id === topic.category_id && t.id !== topicId) {
            const newTopic = updatedSourceTopics.find(st => st.id === t.id);
            return newTopic || t;
          }
          
          if (t.category_id === targetCategoryId && t.id !== topicId) {
            const newTopic = updatedTargetTopics.find(tt => tt.id === t.id);
            return newTopic || t;
          }
          
          return t;
        });
        
        // Update database with new orders
        const topicsToUpdate = [
          { id: topicId, order: newOrder, category_id: targetCategoryId },
          ...updatedSourceTopics.map(t => ({ id: t.id, order: t.order })),
          ...updatedTargetTopics.map(t => ({ id: t.id, order: t.order }))
        ];
        
        await updateTopicsOrder(topicsToUpdate);
        
        setTopics(finalTopics);
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
