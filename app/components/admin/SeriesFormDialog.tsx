'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminSeriesCreateSchema } from '@/lib/validation';
import { DIFFICULTY_OPTIONS } from './admin-client';
import { FormField, OptionSelect } from './FormField';
import { useCreateSubmit } from './useCreateSubmit';

interface SeriesFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function SeriesFormDialog({ open, onOpenChange, onCreated }: SeriesFormDialogProps) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const { fieldErrors, formError, saving, submit } = useCreateSubmit(AdminSeriesCreateSchema, '/api/admin/series');

  const handleSubmit = async () => {
    const ok = await submit({ title, difficulty: difficulty ?? undefined, genre, description, coverImageUrl });
    if (ok) {
      onCreated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New series</DialogTitle>
          <DialogDescription>Create a new show. Seasons and episodes can be added afterwards.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <FormField id="series-title" label="Title" required error={fieldErrors.title}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
          <FormField id="series-difficulty" label="Difficulty" required error={fieldErrors.difficulty}>
            {(p) => (
              <OptionSelect
                {...p}
                value={difficulty}
                onChange={setDifficulty}
                options={DIFFICULTY_OPTIONS}
                placeholder="Select a difficulty"
              />
            )}
          </FormField>
          <FormField id="series-genre" label="Genre" error={fieldErrors.genre}>
            {(p) => <Input {...p} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Drama/Comedy" />}
          </FormField>
          <FormField id="series-cover" label="Cover image URL" error={fieldErrors.coverImageUrl}>
            {(p) => <Input {...p} type="url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} />}
          </FormField>
          <FormField id="series-description" label="Description" error={fieldErrors.description}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
          </FormField>

          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Create series
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
