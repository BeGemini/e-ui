'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminEpisodeCreateSchema } from '@/lib/validation';
import type { OptionItem } from './admin-client';
import { FormField, OptionSelect } from './FormField';
import { useCreateSubmit } from './useCreateSubmit';

interface EpisodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasons: OptionItem[];
  defaultSeasonId?: string;
  onCreated: () => void;
}

export function EpisodeFormDialog({ open, onOpenChange, seasons, defaultSeasonId, onCreated }: EpisodeFormDialogProps) {
  const [seasonId, setSeasonId] = useState<string | null>(defaultSeasonId ?? null);
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { fieldErrors, formError, saving, submit } = useCreateSubmit(AdminEpisodeCreateSchema, '/api/admin/episodes');

  const handleSubmit = async () => {
    const ok = await submit({ seasonId: seasonId ?? '', episodeNumber, title, description });
    if (ok) {
      onCreated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New episode</DialogTitle>
          <DialogDescription>Episode numbers must be unique within a season.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <FormField id="episode-season" label="Season" required error={fieldErrors.seasonId}>
            {(p) => (
              <OptionSelect {...p} value={seasonId} onChange={setSeasonId} options={seasons} placeholder="Select a season" />
            )}
          </FormField>
          <FormField id="episode-number" label="Episode number" required error={fieldErrors.episodeNumber}>
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
              />
            )}
          </FormField>
          <FormField id="episode-title" label="Title" required error={fieldErrors.title}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pilot" />}
          </FormField>
          <FormField id="episode-description" label="Description" error={fieldErrors.description}>
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
              Create episode
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
