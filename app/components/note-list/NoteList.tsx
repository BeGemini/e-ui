'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { NOTE_CATEGORIES } from '@/lib/types';
import type { Note, NoteCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

interface NoteListProps {
  exerciseId: string;
  notes: Note[];
  onNotesChange: () => void;
}

export function NoteList({
  exerciseId,
  notes,
  onNotesChange,
}: NoteListProps) {
  const [editingPoint, setEditingPoint] = useState<Note | null>(null);
  const [editCategory, setEditCategory] = useState<NoteCategory>('word');
  const [editDescription, setEditDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState<Note | null>(null);

  const grouped = NOTE_CATEGORIES.map((config) => ({
    ...config,
    items: notes.filter((kp) => kp.category === config.category),
  })).filter((group) => group.items.length > 0);

  const handleEdit = (kp: Note) => {
    setEditingPoint(kp);
    setEditCategory(kp.category);
    setEditDescription(kp.description);
  };

  const handleSaveEdit = async () => {
    if (!editingPoint || !editDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/notes/${exerciseId}/${editingPoint.noteId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category: editCategory,
            description: editDescription.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update note');
      }

      setEditingPoint(null);
      onNotesChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPoint) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/notes/${exerciseId}/${deletingPoint.noteId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete note');
      }

      setDeletingPoint(null);
      onNotesChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Notes Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Start practicing and create notes from the Correct Text.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <Card key={group.category}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className={group.colorClass}>{group.label}</Badge>
              <span className="text-sm text-muted-foreground">{group.items.length}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((kp) => (
              <div
                key={kp.noteId}
                className="rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium rounded px-1 inline-block', group.colorClass)}>
                      {kp.capturedText}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{kp.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(kp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeletingPoint(kp)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Edit Drawer */}
      <Drawer open={!!editingPoint} onOpenChange={() => setEditingPoint(null)} swipeDirection="right">
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>Edit Note</DrawerTitle>
            <DrawerDescription>
              Update the category and note for &quot;{editingPoint?.capturedText}&quot;.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 overflow-y-auto p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2">
                {NOTE_CATEGORIES.map((config) => (
                  <Button
                    key={config.category}
                    type="button"
                    variant={editCategory === config.category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditCategory(config.category)}
                    className={cn(
                      'flex-1',
                      editCategory === config.category && [config.colorClass, 'hover:bg-primary hover:text-primary-foreground']
                    )}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">Note</label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={8}
                className="max-h-80 overflow-y-auto resize-y"
              />
            </div>
          </div>

          <DrawerFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPoint(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPoint} onOpenChange={() => setDeletingPoint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingPoint?.capturedText}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPoint(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
