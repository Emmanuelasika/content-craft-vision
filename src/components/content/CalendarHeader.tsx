
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryDialog } from '../dialogs/CategoryDialog';
import { Plus, ListFilter, Grid, List } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export type ViewMode = 'list' | 'grid';
export type SortOption = 'dateAdded' | 'alphabetical';

interface CalendarHeaderProps {
  onAddCategory: (name: string) => Promise<void>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
}

export function CalendarHeader({ 
  onAddCategory, 
  viewMode, 
  onViewModeChange,
  sortOption,
  onSortOptionChange
}: CalendarHeaderProps) {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  const handleAddCategory = async (name: string) => {
    await onAddCategory(name);
  };

  return (
    <header className="py-6 px-4 sm:px-6 animate-slide-down">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">My Content</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and track your content creation process
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={() => setIsAddCategoryOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full hover:opacity-90 transition-opacity"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
          
          <div className="flex border rounded-full overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-3 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-purple-600'}`}
              onClick={() => onViewModeChange('list')}
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`rounded-none px-3 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-purple-600'}`}
              onClick={() => onViewModeChange('grid')}
            >
              <Grid className="mr-2 h-4 w-4" />
              Grid
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-800 dark:hover:bg-purple-900/30"
              >
                <ListFilter className="mr-2 h-4 w-4 text-purple-500" />
                {sortOption === 'dateAdded' ? 'Date Added' : 'Alphabetical'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className={sortOption === 'dateAdded' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                onClick={() => onSortOptionChange('dateAdded')}
              >
                Date Added
              </DropdownMenuItem>
              <DropdownMenuItem 
                className={sortOption === 'alphabetical' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                onClick={() => onSortOptionChange('alphabetical')}
              >
                Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
