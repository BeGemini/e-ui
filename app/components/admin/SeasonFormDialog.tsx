'use client';

import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminSeasonCreateSchema } from '@/lib/validation';
import type { OptionItem } from './admin-client';
import { FormField, OptionSelect } from './FormField';
import { useCreateSubmit } from './useCreateSubmit';

interface SeasonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: OptionItem[];
  defaultSeriesId?: string;
  onCreated: () => void;
}

export function SeasonFormDialog({ open, onOpenChange, series, defaultSeriesId, onCreated }: SeasonFormDialogProps) {
  const [seriesId, setSeriesId] = useState<string | null>(defaultSeriesId ?? null);
  const [seasonNumber, setSeasonNumber] = useState('');
  const [description, setDescription] = useState('');
  const { fieldErrors, formError, saving, submit } = useCreateSubmit(AdminSeasonCreateSchema, '/api/admin/seasons');

  const handleSubmit = async () => {
    const ok = await submit({ seriesId: seriesId ?? '', seasonNumber, description });
    if (ok) {
      onCreated();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New season</DialogTitle>
          <DialogDescription>Season numbers must be unique within a series.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <FormField id="season-series" label="Series" required error={fieldErrors.seriesId}>
            {(p) => (
              <OptionSelect {...p} value={seriesId} onChange={setSeriesId} options={series} placeholder="Select a series" />
            )}
          </FormField>
          <FormField id="season-number" label="Season number" required error={fieldErrors.seasonNumber}>
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(e.target.value)}
              />
            )}
          </FormField>
          <FormField id="season-description" label="Description" error={fieldErrors.description}>
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
              Create season
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
