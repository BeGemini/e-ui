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
import { KNOWLEDGE_POINT_CATEGORIES } from '@/lib/types';
import type { KnowledgePoint, KnowledgePointCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

interface KnowledgePointListProps {
  exerciseId: string;
  knowledgePoints: KnowledgePoint[];
  onKnowledgePointsChange: () => void;
}

export function KnowledgePointList({
  exerciseId,
  knowledgePoints,
  onKnowledgePointsChange,
}: KnowledgePointListProps) {
  const [editingPoint, setEditingPoint] = useState<KnowledgePoint | null>(null);
  const [editCategory, setEditCategory] = useState<KnowledgePointCategory>('word');
  const [editDescription, setEditDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState<KnowledgePoint | null>(null);

  const grouped = KNOWLEDGE_POINT_CATEGORIES.map((config) => ({
    ...config,
    items: knowledgePoints.filter((kp) => kp.category === config.category),
  })).filter((group) => group.items.length > 0);

  const handleEdit = (kp: KnowledgePoint) => {
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
        `/api/knowledge-points/${exerciseId}/${editingPoint.knowledgePointId}`,
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
        throw new Error(data.error || 'Failed to update knowledge point');
      }

      setEditingPoint(null);
      onKnowledgePointsChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update knowledge point');
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
        `/api/knowledge-points/${exerciseId}/${deletingPoint.knowledgePointId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete knowledge point');
      }

      setDeletingPoint(null);
      onKnowledgePointsChange();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete knowledge point');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (knowledgePoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Knowledge Points Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Start practicing and create knowledge points from the Correct Text.
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
                key={kp.knowledgePointId}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingPoint} onOpenChange={() => setEditingPoint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Knowledge Point</DialogTitle>
            <DialogDescription>
              Update the category and note for &quot;{editingPoint?.capturedText}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2">
                {KNOWLEDGE_POINT_CATEGORIES.map((config) => (
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
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPoint(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPoint} onOpenChange={() => setDeletingPoint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Knowledge Point</DialogTitle>
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
