import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useContent } from '../hooks/useContent';
import * as supabaseMock from '../__mocks__/supabase'; // Import the module itself
import { toast } from 'sonner';
import { Category, Topic } from '@/lib/supabase';

// Mock the entire supabase module
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase')>('@/lib/supabase');
  const mockModule = await import('../__mocks__/supabase');
  return {
    ...actual, // Use actual for types if needed, but functions are mocked
    ...mockModule, // Spread all named mock functions
  };
});

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock AuthContext
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: vi.fn(),
  }),
}));

const mockedGetCategories = supabaseMock.getCategories;
const mockedGetTopics = supabaseMock.getTopics;
const mockedCreateCategory = supabaseMock.createCategory;
const mockedCreateTopic = supabaseMock.createTopic;
// Add other mocked functions if they are used directly in tests
// const mockedUpdateCategory = supabaseMock.updateCategory;
// const mockedDeleteCategory = supabaseMock.deleteCategory;
// const mockedUpdateTopic = supabaseMock.updateTopic;
// const mockedDeleteTopic = supabaseMock.deleteTopic;
// const mockedUpdateTopicsOrder = supabaseMock.updateTopicsOrder;
// const mockedUpdateCategoriesOrder = supabaseMock.updateCategoriesOrder;


describe('useContent hook', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementations for fetching
    mockedGetCategories.mockResolvedValue({ data: [], error: null });
    mockedGetTopics.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchData initial "General" category', () => {
    it('should create a "General" category on initial load if none exists and no other categories exist', async () => {
      mockedGetCategories.mockResolvedValueOnce({ data: [], error: null });
      const newGeneralCategory: Category = { id: 'general-1', name: 'General', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
      mockedCreateCategory.mockResolvedValueOnce({ data: [newGeneralCategory], error: null });

      const { result, waitForNextUpdate } = renderHook(() => useContent());
      
      await act(async () => {
        await waitForNextUpdate(); // Wait for useEffect to run and fetchData to complete
      });

      expect(mockedGetCategories).toHaveBeenCalledWith(mockUser.id);
      expect(mockedCreateCategory).toHaveBeenCalledWith(mockUser.id, 'General', 0); // Order 0 for the first category
      expect(result.current.categories).toEqual([newGeneralCategory]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should create a "General" category with order 0 if other categories exist but "General" does not', async () => {
        const existingCategories: Category[] = [
            { id: 'cat-1', name: 'Existing Cat 1', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() },
            { id: 'cat-2', name: 'Existing Cat 2', user_id: mockUser.id, order: 1, created_at: new Date().toISOString() },
        ];
        mockedGetCategories.mockResolvedValueOnce({ data: [...existingCategories], error: null });
        
        const newGeneralCategory: Category = { id: 'general-new', name: 'General', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
        // Mock createCategory for "General"
        mockedCreateCategory.mockResolvedValueOnce({ data: [newGeneralCategory], error: null });
        
        // Mock updateCategoriesOrder because fetchData will shift existing categories
        supabaseMock.updateCategoriesOrder.mockResolvedValueOnce({ data: null, error: null });

        const { result, waitForNextUpdate } = renderHook(() => useContent());

        await act(async () => {
            await waitForNextUpdate(); // Wait for initial fetchData
        });
        
        expect(mockedGetCategories).toHaveBeenCalledWith(mockUser.id);
        expect(mockedCreateCategory).toHaveBeenCalledWith(mockUser.id, 'General', 0); // General is created with order 0
        
        // Existing categories should have their order shifted
        expect(supabaseMock.updateCategoriesOrder).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'cat-1', order: 1 }),
            expect.objectContaining({ id: 'cat-2', order: 2 }),
          ])
        );

        // Check final categories state: General at order 0, others shifted and sorted
        const expectedCategories = [
            newGeneralCategory, // General at order 0
            { ...existingCategories[0], order: 1 }, // cat-1 shifted to order 1
            { ...existingCategories[1], order: 2 }, // cat-2 shifted to order 2
        ].sort((a,b) => a.order - b.order);

        expect(result.current.categories).toEqual(expect.arrayContaining(expectedCategories));
        expect(result.current.categories.length).toBe(expectedCategories.length);
        expect(result.current.isLoading).toBe(false);
    });


    it('should NOT create "General" category if it already exists', async () => {
      const existingCategories: Category[] = [
        { id: 'general-1', name: 'General', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() },
        { id: 'cat-2', name: 'Another', user_id: mockUser.id, order: 1, created_at: new Date().toISOString() },
      ];
      mockedGetCategories.mockResolvedValueOnce({ data: existingCategories, error: null });

      const { result, waitForNextUpdate } = renderHook(() => useContent());
      
      await act(async () => {
        await waitForNextUpdate();
      });

      expect(mockedGetCategories).toHaveBeenCalledWith(mockUser.id);
      expect(mockedCreateCategory).not.toHaveBeenCalled(); // Should not be called as General exists
      expect(result.current.categories).toEqual(existingCategories);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('addCategory', () => {
    it('should add a new category successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useContent());
       await act(async () => { // Initial fetch
        await waitForNextUpdate();
      });

      const categoryName = 'New Category';
      const newCategory: Category = { id: 'cat-1', name: categoryName, user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
      mockedCreateCategory.mockResolvedValueOnce({ data: [newCategory], error: null });

      let addedCategoryReturn: Category | null = null;
      await act(async () => {
        addedCategoryReturn = await result.current.addCategory(categoryName);
      });

      expect(mockedCreateCategory).toHaveBeenCalledWith(mockUser.id, categoryName, result.current.categories.length -1); // Order based on current length
      expect(result.current.categories).toContainEqual(newCategory);
      expect(addedCategoryReturn).toEqual(newCategory);
      expect(toast.success).toHaveBeenCalledWith(`Category "${categoryName}" created`);
    });

    it('should prevent adding a duplicate "General" category if one already exists', async () => {
      const initialGeneralCategory: Category = { id: 'general-1', name: 'General', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
      // Setup initial state to include a "General" category
      mockedGetCategories.mockResolvedValueOnce({ data: [initialGeneralCategory], error: null });
      
      const { result, waitForNextUpdate } = renderHook(() => useContent());
      await act(async () => {
        await waitForNextUpdate(); // Initial fetch completes, populating categories
      });

      expect(result.current.categories).toEqual([initialGeneralCategory]); // Ensure General is there

      mockedCreateCategory.mockClear(); // Clear any calls from initial fetch if General was auto-created

      let addGeneralReturn: Category | null = null;
      await act(async () => {
        addGeneralReturn = await result.current.addCategory('General');
      });

      expect(mockedCreateCategory).not.toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith("A 'General' category already exists.");
      expect(result.current.categories).toEqual([initialGeneralCategory]); // State should not change
      expect(addGeneralReturn).toBeNull();
    });
    
    it('should add a "General" category successfully if it does not exist', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useContent());
        await act(async () => { // Initial fetch (might create General if store is empty)
            await waitForNextUpdate();
        });

        // If initial fetch created 'General', this test needs to ensure it can still be added if it *wasn't* there.
        // So, let's assume initial state is empty for this specific test logic after initial load.
        result.current.categories = []; 
        mockedCreateCategory.mockClear(); // Clear calls from initial load

        const generalCategoryName = 'General';
        const newGeneralCategory: Category = { id: 'gen-2', name: generalCategoryName, user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
        mockedCreateCategory.mockResolvedValueOnce({ data: [newGeneralCategory], error: null });
        
        let addedCategoryReturn: Category | null = null;
        await act(async () => {
            addedCategoryReturn = await result.current.addCategory(generalCategoryName);
        });

        expect(mockedCreateCategory).toHaveBeenCalledWith(mockUser.id, generalCategoryName, 0); // Expect order 0 for the first category
        expect(result.current.categories).toContainEqual(newGeneralCategory);
        expect(addedCategoryReturn).toEqual(newGeneralCategory);
        expect(toast.success).toHaveBeenCalledWith(`Category "${generalCategoryName}" created`);
    });
  });

  describe('addTopic', () => {
    it('should add a new topic successfully to an existing category', async () => {
      const existingCategory: Category = { id: 'cat-123', name: 'Tutorials', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
      mockedGetCategories.mockResolvedValueOnce({ data: [existingCategory], error: null }); // Initial categories
      mockedGetTopics.mockResolvedValueOnce({data: [], error: null}); // Initial topics

      const { result, waitForNextUpdate } = renderHook(() => useContent());
      await act(async () => {
        await waitForNextUpdate(); // Wait for initial data load
      });
      
      expect(result.current.categories).toEqual([existingCategory]); // Ensure category is loaded

      const topicTitle = 'New React Topic';
      const newTopic: Topic = { 
        id: 'topic-1', 
        title: topicTitle, 
        category_id: existingCategory.id, 
        user_id: mockUser.id, 
        order: 0, 
        completed: false, 
        created_at: new Date().toISOString() 
      };
      mockedCreateTopic.mockResolvedValueOnce({ data: [newTopic], error: null });

      let addedTopicReturn: Topic | null = null;
      await act(async () => {
        addedTopicReturn = await result.current.addTopic(existingCategory.id, topicTitle);
      });

      expect(mockedCreateTopic).toHaveBeenCalledWith(mockUser.id, existingCategory.id, topicTitle, 0); // Order 0 as it's the first topic in this category
      expect(result.current.topics).toContainEqual(newTopic);
      expect(addedTopicReturn).toEqual(newTopic);
      expect(toast.success).toHaveBeenCalledWith('Topic added');
    });

     it('should add a new topic with correct order if other topics exist in the category', async () => {
      const existingCategory: Category = { id: 'cat-456', name: 'Blog Posts', user_id: mockUser.id, order: 0, created_at: new Date().toISOString() };
      const existingTopic: Topic = {
        id: 'topic-prev', title: 'Old Topic', category_id: existingCategory.id, user_id: mockUser.id, order: 0, completed: false, created_at: new Date().toISOString()
      };
      mockedGetCategories.mockResolvedValueOnce({ data: [existingCategory], error: null });
      mockedGetTopics.mockResolvedValueOnce({ data: [existingTopic], error: null });


      const { result, waitForNextUpdate } = renderHook(() => useContent());
      await act(async () => {
        await waitForNextUpdate();
      });

      const topicTitle = 'Another Blog Topic';
      const newTopic: Topic = { 
        id: 'topic-new', 
        title: topicTitle, 
        category_id: existingCategory.id, 
        user_id: mockUser.id, 
        order: 1, // Should be next in order
        completed: false, 
        created_at: new Date().toISOString() 
      };
      mockedCreateTopic.mockResolvedValueOnce({ data: [newTopic], error: null });

      await act(async () => {
        await result.current.addTopic(existingCategory.id, topicTitle);
      });

      expect(mockedCreateTopic).toHaveBeenCalledWith(mockUser.id, existingCategory.id, topicTitle, 1); // Order 1
      expect(result.current.topics).toContainEqual(newTopic);
      expect(result.current.topics.find(t => t.id === 'topic-prev')?.order).toBe(0); // Existing topic order unchanged by addTopic
    });
  });
});

// Helper to wait for next update in tests if needed, though `act` with async usually covers it
// const waitForNextUpdate = (hookResult: any) => {
//   return new Promise<void>((resolve) => {
//     const originalSetState = hookResult.current.setState; // Assuming setState is exposed or find a way to hook
//     hookResult.current.setState = (...args: any) => {
//       originalSetState(...args);
//       resolve();
//       hookResult.current.setState = originalSetState;
//     };
//   });
// };
