'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminExerciseCreateSchema, AdminExerciseProbeSchema } from '@/lib/validation';
import type { AdminExerciseCreateResponse, Difficulty, ExerciseProbeResult, ProbeIssue } from '@/lib/types';
import { adminFetch, DIFFICULTY_OPTIONS, formatDuration, toFieldErrors, type FieldErrors, type OptionItem } from './admin-client';
import { FormField, OptionSelect } from './FormField';

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episodes: OptionItem[];
  defaultEpisodeId?: string;
  onCreated: () => void;
}

const INHERIT = '__inherit__';

function ProbeError({ id, issue }: { id: string; issue?: ProbeIssue }) {
  if (!issue) return null;
  return (
    <Alert id={id} variant="destructive" role="alert">
      <AlertCircle />
      <AlertDescription>{issue.message}</AlertDescription>
    </Alert>
  );
}

export function ExerciseFormDialog({ open, onOpenChange, episodes, defaultEpisodeId, onCreated }: ExerciseFormDialogProps) {
  const [episodeId, setEpisodeId] = useState<string | null>(defaultEpisodeId ?? null);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<string>(INHERIT);
  const [videoUrl, setVideoUrl] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState('');

  const [probe, setProbe] = useState<ExerciseProbeResult | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [probing, setProbing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');

  // Any URL change invalidates the previous probe (FR-015).
  const changeResource = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setProbe(null);
    setWarningAcknowledged(false);
  };

  const runProbe = async () => {
    setFormError('');
    const check = AdminExerciseProbeSchema.safeParse({ videoUrl, subtitleUrl });
    if (!check.success) {
      setFieldErrors((prev) => ({ ...prev, ...z.flattenError(check.error).fieldErrors }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, videoUrl: undefined, subtitleUrl: undefined }));
    setProbing(true);
    try {
      const res = await adminFetch<ExerciseProbeResult & { error?: string }>('/api/admin/exercises/probe', {
        method: 'POST',
        body: { videoUrl, subtitleUrl },
      });
      if (!res.ok) {
        setFormError(res.data.error ?? 'Validation request failed');
        return;
      }
      setProbe(res.data);
      setWarningAcknowledged(false);
    } catch {
      setFormError('Network error. Please retry.');
    } finally {
      setProbing(false);
    }
  };

  const save = async () => {
    setFormError('');
    const payload = {
      episodeId: episodeId ?? '',
      title,
      difficulty: difficulty === INHERIT ? null : (difficulty as Difficulty),
      videoUrl,
      subtitleUrl,
    };
    const check = AdminExerciseCreateSchema.safeParse(payload);
    if (!check.success) {
      setFieldErrors(z.flattenError(check.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await adminFetch<AdminExerciseCreateResponse & { error?: string; probe?: ExerciseProbeResult }>(
        '/api/admin/exercises',
        { method: 'POST', body: payload }
      );
      if (res.status === 201) {
        onCreated();
        onOpenChange(false);
        return;
      }
      if (res.status === 422 && res.data.probe) {
        setProbe(res.data.probe);
        setWarningAcknowledged(false);
        setFormError('The resources changed since validation. Please review the errors below.');
        return;
      }
      setFieldErrors(toFieldErrors(res.data));
      setFormError(res.data.error ?? 'Could not create exercise');
    } catch {
      setFormError('Network error. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const hasWarnings = (probe?.warnings.length ?? 0) > 0;
  const canSave = Boolean(probe?.ok) && (!hasWarnings || warningAcknowledged) && !saving && !probing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New exercise</DialogTitle>
          <DialogDescription>
            Paste the COS paths of the video and subtitle, then validate. Format, sentence count and duration are read
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) void save();
          }}
        >
          <FormField id="exercise-episode" label="Episode" required error={fieldErrors.episodeId}>
            {(p) => (
              <OptionSelect {...p} value={episodeId} onChange={setEpisodeId} options={episodes} placeholder="Select an episode" />
            )}
          </FormField>

          <FormField id="exercise-title" label="Title" required error={fieldErrors.title}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Version" />}
          </FormField>

          <FormField id="exercise-difficulty" label="Difficulty" error={fieldErrors.difficulty}>
            {(p) => (
              <OptionSelect
                {...p}
                value={difficulty}
                onChange={(v) => setDifficulty(v ?? INHERIT)}
                options={[{ value: INHERIT, label: 'Same as series' }, ...DIFFICULTY_OPTIONS]}
                placeholder="Same as series"
              />
            )}
          </FormField>

          <FormField
            id="exercise-video"
            label="Video"
            required
            error={fieldErrors.videoUrl}
            hint="COS object path (e.g. Show/S01/E01.mp4) or full bucket URL. MP4/M4V/MOV."
          >
            {(p) => (
              <Input {...p} value={videoUrl} onChange={(e) => changeResource(setVideoUrl)(e.target.value)} autoComplete="off" />
            )}
          </FormField>
          {probe && !probe.video.ok && <ProbeError id="exercise-video-probe" issue={probe.video.error} />}

          <FormField
            id="exercise-subtitle"
            label="Subtitle"
            required
            error={fieldErrors.subtitleUrl}
            hint="COS object path or full bucket URL. SRT/VTT/SSA/ASS, UTF-8."
          >
            {(p) => (
              <Input
                {...p}
                value={subtitleUrl}
                onChange={(e) => changeResource(setSubtitleUrl)(e.target.value)}
                autoComplete="off"
              />
            )}
          </FormField>
          {probe && !probe.subtitle.ok && <ProbeError id="exercise-subtitle-probe" issue={probe.subtitle.error} />}

          <Button type="button" variant="outline" onClick={runProbe} disabled={probing || saving}>
            {probing && <Loader2 className="animate-spin" aria-hidden="true" />}
            {probing ? 'Validating…' : 'Validate resources'}
          </Button>

          {probe?.ok && (
            <Alert aria-live="polite">
              <CheckCircle2 />
              <AlertTitle>Resources validated</AlertTitle>
              <AlertDescription>
                <span className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">Format: {probe.subtitle.subtitleFormat?.toUpperCase()}</Badge>
                  <Badge variant="secondary">Sentences: {probe.subtitle.totalSentences}</Badge>
                  <Badge variant="secondary">Duration: {formatDuration(probe.video.durationSeconds ?? 0)}</Badge>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {probe?.ok && hasWarnings && (
            <Alert>
              <TriangleAlert />
              <AlertTitle>Please check</AlertTitle>
              <AlertDescription>
                {probe.warnings.map((w) => (
                  <span key={w.code} className="block">
                    {w.message}
                  </span>
                ))}
                <span className="mt-2 flex items-center gap-2">
                  <Checkbox
                    id="exercise-ack-warning"
                    checked={warningAcknowledged}
                    onCheckedChange={(checked) => setWarningAcknowledged(checked === true)}
                  />
                  <Label htmlFor="exercise-ack-warning">I have checked and want to save anyway</Label>
                </span>
              </AlertDescription>
            </Alert>
          )}

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
            <Button type="submit" disabled={!canSave}>
              {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save exercise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
