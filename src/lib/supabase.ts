import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set by the user in their own environment
// In the future, the user can use the Lovable UI to set these up with Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  order: number;
  created_at: string;
};

export type Topic = {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  order: number;
  completed: boolean;
  created_at: string;
};

// Auth functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

// Categories CRUD
export const getCategories = async (userId: string) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
    
  return { data, error };
};

export const createCategory = async (userId: string, name: string, order: number) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ user_id: userId, name, order }])
    .select();
    
  return { data, error };
};

export const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select();
    
  return { data, error };
};

export const deleteCategory = async (id: string) => {
  // First, get all topics in this category to move them to General
  const { data: generalCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'General')
    .single();
    
  if (generalCategory && generalCategory.id) {
    // Move all topics to General category
    await supabase
      .from('topics')
      .update({ category_id: generalCategory.id })
      .eq('category_id', id);
  }
  
  // Then delete the category
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
    
  return { error };
};

// Topics CRUD
export const getTopics = async (userId: string) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
    
  return { data, error };
};

export const createTopic = async (userId: string, categoryId: string, title: string, order: number) => {
  const { data, error } = await supabase
    .from('topics')
    .insert([{ 
      user_id: userId, 
      category_id: categoryId, 
      title, 
      order,
      completed: false 
    }])
    .select();
    
  return { data, error };
};

export const updateTopic = async (id: string, updates: Partial<Omit<Topic, 'id' | 'user_id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('topics')
    .update(updates)
    .eq('id', id)
    .select();
    
  return { data, error };
};

export const deleteTopic = async (id: string) => {
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', id);
    
  return { error };
};

// Reordering functions
export const updateTopicsOrder = async (topicsToUpdate: { id: string, order: number, category_id?: string }[]) => {
  const { error } = await supabase.rpc('update_topics_order', {
    topics_data: topicsToUpdate
  });
  
  return { error };
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string, order: number }[]) => {
  const { error } = await supabase.rpc('update_categories_order', {
    categories_data: categoriesToUpdate
  });
  
  return { error };
};
