
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryDialog } from '../dialogs/CategoryDialog';
import { Plus, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarHeaderProps {
  onAddCategory: (name: string) => Promise<void>;
}

export function CalendarHeader({ onAddCategory }: CalendarHeaderProps) {
  const { user, signOut } = useAuth();
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const handleAddCategory = async (name: string) => {
    await onAddCategory(name);
  };

  return (
    <header className="py-6 px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-down">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
        {user && (
          <p className="text-sm text-muted-foreground mt-1">
            Logged in as {user.email}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <Button 
          onClick={() => setIsAddCategoryOpen(true)}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
        
        <Button 
          variant="outline" 
          onClick={signOut}
          className="flex items-center"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
      
      <CategoryDialog
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSubmit={handleAddCategory}
        title="Add Category"
        description="Create a new category for organizing your topics"
        confirmText="Add Category"
      />
    </header>
  );
}
