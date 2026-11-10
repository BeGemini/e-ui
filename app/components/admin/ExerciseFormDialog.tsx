'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminExerciseCreateSchema, AdminExerciseFetchTedSchema, AdminExerciseProbeSchema } from '@/lib/validation';
import type {
  AdminExerciseCreateResponse,
  Difficulty,
  ExerciseProbeResult,
  ProbeIssue,
  TedFetchErrorResponse,
  TedFetchStatus,
  TedFetchSuccessResponse,
} from '@/lib/types';
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

type TedApiResponse = Partial<TedFetchSuccessResponse> & TedFetchErrorResponse;

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

  const [activeTab, setActiveTab] = useState('manual');
  const [tedUrl, setTedUrl] = useState('');
  const [tedUploadToCos, setTedUploadToCos] = useState(true);
  const [tedStatus, setTedStatus] = useState<TedFetchStatus>('idle');
  const [tedError, setTedError] = useState('');
  const tedController = useRef<AbortController | null>(null);
  const tedOperation = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      tedOperation.current += 1;
      tedController.current?.abort();
    };
  }, []);

  const invalidateTedFetch = () => {
    tedOperation.current += 1;
    tedController.current?.abort();
    tedController.current = null;
    if (mounted.current) {
      setTedStatus((current) => (current === 'fetching' ? 'idle' : current));
    }
  };

  const changeResource = (setter: (value: string) => void) => (value: string) => {
    invalidateTedFetch();
    setter(value);
    setProbe(null);
    setWarningAcknowledged(false);
  };

  const handleTabChange = (value: string | number) => {
    const nextTab = String(value);
    if (nextTab !== 'ted' && tedStatus === 'fetching') invalidateTedFetch();
    setActiveTab(nextTab);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) invalidateTedFetch();
    onOpenChange(nextOpen);
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

  const fetchTed = async () => {
    if (tedStatus === 'fetching') return;
    setFormError('');
    const check = AdminExerciseFetchTedSchema.safeParse({ url: tedUrl, uploadToCos: tedUploadToCos });
    if (!check.success) {
      setFieldErrors((prev) => ({ ...prev, ...z.flattenError(check.error).fieldErrors }));
      return;
    }

    invalidateTedFetch();
    const operation = tedOperation.current;
    const controller = new AbortController();
    tedController.current = controller;
    setFieldErrors((prev) => ({ ...prev, url: undefined }));
    setTedError('');
    setTedStatus('fetching');

    try {
      const res = await adminFetch<TedApiResponse>('/api/admin/exercises/fetch-ted', {
        method: 'POST',
        body: { url: check.data.url, uploadToCos: check.data.uploadToCos },
        signal: controller.signal,
      });
      if (!mounted.current || operation !== tedOperation.current) return;
      if (!res.ok) {
        setFieldErrors(toFieldErrors(res.data));
        setTedError(res.data.error ?? 'Could not fetch TED media');
        setTedStatus('error');
        return;
      }
      if (!res.data.videoUrl || !res.data.subtitleUrl || !res.data.probe?.ok) {
        setTedError('The server returned incomplete TED media. Please retry.');
        setTedStatus('error');
        return;
      }

      setVideoUrl(res.data.videoUrl);
      setSubtitleUrl(res.data.subtitleUrl);
      setProbe(res.data.probe);
      setWarningAcknowledged(false);
      setFieldErrors((prev) => ({ ...prev, videoUrl: undefined, subtitleUrl: undefined, url: undefined }));
      setTedStatus('success');
    } catch (error) {
      if (!mounted.current || operation !== tedOperation.current) return;
      if (error instanceof Error && error.name === 'AbortError') return;
      setTedError('Network error. Please retry.');
      setTedStatus('error');
    } finally {
      if (operation === tedOperation.current) tedController.current = null;
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
        handleOpenChange(false);
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
  const canSave =
    Boolean(probe?.ok) && (!hasWarnings || warningAcknowledged) && !saving && !probing && tedStatus !== 'fetching';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New exercise</DialogTitle>
          <DialogDescription>
            Enter COS paths manually or fetch a TED Talk. Format, sentence count and duration are read automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) void save();
          }}
        >
          <FormField id="exercise-episode" label="Episode" required error={fieldErrors.episodeId}>
            {(props) => (
              <OptionSelect {...props} value={episodeId} onChange={setEpisodeId} options={episodes} placeholder="Select an episode" />
            )}
          </FormField>

          <FormField id="exercise-title" label="Title" required error={fieldErrors.title}>
            {(props) => (
              <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Full Version" />
            )}
          </FormField>

          <FormField id="exercise-difficulty" label="Difficulty" error={fieldErrors.difficulty}>
            {(props) => (
              <OptionSelect
                {...props}
                value={difficulty}
                onChange={(value) => setDifficulty(value ?? INHERIT)}
                options={[{ value: INHERIT, label: 'Same as series' }, ...DIFFICULTY_OPTIONS]}
                placeholder="Same as series"
              />
            )}
          </FormField>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="ted">Fetch TED Talks</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="grid gap-4 pt-4">
              <FormField
                id="exercise-video"
                label="Video"
                required
                error={fieldErrors.videoUrl}
                hint="COS object path (e.g. Show/S01/E01.mp4) or full bucket URL. MP4/M4V/MOV."
              >
                {(props) => (
                  <Input
                    {...props}
                    value={videoUrl}
                    onChange={(event) => changeResource(setVideoUrl)(event.target.value)}
                    autoComplete="off"
                  />
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
                {(props) => (
                  <Input
                    {...props}
                    value={subtitleUrl}
                    onChange={(event) => changeResource(setSubtitleUrl)(event.target.value)}
                    autoComplete="off"
                  />
                )}
              </FormField>
              {probe && !probe.subtitle.ok && <ProbeError id="exercise-subtitle-probe" issue={probe.subtitle.error} />}

              <Button type="button" variant="outline" onClick={runProbe} disabled={probing || saving || tedStatus === 'fetching'}>
                {probing && <Loader2 className="animate-spin" aria-hidden="true" />}
                {probing ? 'Validating…' : 'Validate resources'}
              </Button>
            </TabsContent>
            <TabsContent value="ted" className="grid gap-4 pt-4">
              <FormField
                id="exercise-ted-url"
                label="TED Talk URL"
                required
                error={fieldErrors.url}
                hint="One public talk page, for example https://www.ted.com/talks/speaker_talk_title"
              >
                {(props) => (
                  <Input
                    {...props}
                    value={tedUrl}
                    onChange={(event) => {
                      invalidateTedFetch();
                      setTedUrl(event.target.value);
                      setTedError('');
                      setTedStatus('idle');
                    }}
                    placeholder="https://www.ted.com/talks/…"
                    autoComplete="off"
                    disabled={saving}
                  />
                )}
              </FormField>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exercise-ted-upload-to-cos"
                  checked={tedUploadToCos}
                  onCheckedChange={(checked) => setTedUploadToCos(checked === true)}
                  disabled={saving || tedStatus === 'fetching'}
                />
                <Label htmlFor="exercise-ted-upload-to-cos">
                  Upload video to COS (uncheck to stream directly from TED)
                </Label>
              </div>
              <Button type="button" variant="outline" onClick={fetchTed} disabled={tedStatus === 'fetching' || saving || probing}>
                {tedStatus === 'fetching' && <Loader2 className="animate-spin" aria-hidden="true" />}
                {tedStatus === 'fetching' ? 'Fetching TED Talk…' : tedStatus === 'error' ? 'Retry fetch' : 'Fetch video & subtitles'}
              </Button>

              {tedStatus === 'idle' && (
                <Alert aria-live="polite">
                  <AlertTitle>Ready to fetch</AlertTitle>
                  <AlertDescription>
                    {tedUploadToCos
                      ? 'The video and its English subtitles will be saved to COS for this draft.'
                      : 'Only the English subtitles will be saved to COS. The video will stream directly from TED.'}
                  </AlertDescription>
                </Alert>
              )}
              {tedStatus === 'fetching' && (
                <Alert aria-live="polite" aria-busy="true">
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  <AlertTitle>Fetching TED media</AlertTitle>
                  <AlertDescription>
                    {tedUploadToCos
                      ? 'This can take up to 5 minutes. Keep this dialog open.'
                      : 'This usually takes a few seconds. Keep this dialog open.'}
                  </AlertDescription>
                </Alert>
              )}
              {tedStatus === 'error' && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle />
                  <AlertTitle>Could not fetch TED media</AlertTitle>
                  <AlertDescription>{tedError}</AlertDescription>
                </Alert>
              )}
              {tedStatus === 'success' && (
                <Alert aria-live="polite">
                  <CheckCircle2 />
                  <AlertTitle>TED media ready</AlertTitle>
                  <AlertDescription>
                    <span className="block break-all">Video: {videoUrl}</span>
                    <span className="block break-all">Subtitle: {subtitleUrl}</span>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

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
                {probe.warnings.map((warning) => (
                  <span key={warning.code} className="block">
                    {warning.message}
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
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
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
