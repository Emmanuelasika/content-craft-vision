
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from '@/lib/supabase';

interface TopicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, categoryId: string) => Promise<void>;
  title: string;
  description: string;
  confirmText: string;
  initialValue?: string;
  initialCategoryId?: string;
  categories: Category[];
  editMode?: boolean;
}

export function TopicDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  confirmText,
  initialValue = '',
  initialCategoryId = '',
  categories,
  editMode = false,
}: TopicDialogProps) {
  const [topicTitle, setTopicTitle] = useState(initialValue);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !categoryId) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(topicTitle.trim(), categoryId);
      setTopicTitle('');
      setCategoryId(categories[0]?.id || '');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset the form when dialog opens with new values
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTopicTitle(initialValue);
      setCategoryId(initialCategoryId || categories[0]?.id || '');
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Enter topic title"
                autoFocus
              />
            </div>
            {!editMode && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!topicTitle.trim() || (!editMode && !categoryId) || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
