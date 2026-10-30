'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminContentTree } from '@/lib/types';
import { adminFetch, episodeOptions, seasonOptions, seriesOptions } from '@/app/components/admin/admin-client';
import { ContentTree, type CreateLevel } from '@/app/components/admin/ContentTree';
import { SeriesFormDialog } from '@/app/components/admin/SeriesFormDialog';
import { SeasonFormDialog } from '@/app/components/admin/SeasonFormDialog';
import { EpisodeFormDialog } from '@/app/components/admin/EpisodeFormDialog';
import { ExerciseFormDialog } from '@/app/components/admin/ExerciseFormDialog';

type DialogState = { type: 'series' } | { type: CreateLevel; parentId?: string } | null;

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [tree, setTree] = useState<AdminContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);

  const loadTree = useCallback(async () => {
    setError('');
    try {
      const res = await adminFetch<AdminContentTree & { error?: string }>('/api/admin/content');
      if (!res.ok) {
        setError(res.data.error ?? 'Could not load content');
        return;
      }
      setTree(res.data);
    } catch {
      setError('Network error. Please reload.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Client-side guard for UX only; every /api/admin route enforces admin on the server.
  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          router.replace('/');
          return;
        }
        const data = (await res.json()) as { user?: { role?: string } };
        if (data.user?.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setAuthorized(true);
        await loadTree();
      } catch {
        router.replace('/');
      }
    };
    void checkAdmin();
  }, [router, loadTree]);

  const options = useMemo(
    () => ({ series: seriesOptions(tree), seasons: seasonOptions(tree), episodes: episodeOptions(tree) }),
    [tree]
  );

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };
  const onCreated = () => void loadTree();

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }

  const hasEpisodes = options.episodes.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="border-b bg-white shadow">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
            <ArrowLeft aria-hidden="true" />
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Series</CardTitle>
            <CardDescription>Expand a level to browse it, or use the + buttons to add content underneath.</CardDescription>
            <CardAction className="flex flex-wrap gap-2">
              <Button onClick={() => setDialog({ type: 'series' })}>
                <Plus aria-hidden="true" />
                Series
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialog({ type: 'exercise' })}
                disabled={!hasEpisodes}
                title={hasEpisodes ? undefined : 'Create an episode first'}
              >
                <Plus aria-hidden="true" />
                Exercise
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading && (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground" aria-live="polite">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading content…
              </p>
            )}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {tree && !loading && (
              <ContentTree tree={tree} onCreateChild={(type, parentId) => setDialog({ type, parentId })} />
            )}
          </CardContent>
        </Card>
      </main>

      {dialog?.type === 'series' && <SeriesFormDialog open onOpenChange={closeDialog} onCreated={onCreated} />}
      {dialog?.type === 'season' && (
        <SeasonFormDialog
          open
          onOpenChange={closeDialog}
          series={options.series}
          defaultSeriesId={dialog.parentId}
          onCreated={onCreated}
        />
      )}
      {dialog?.type === 'episode' && (
        <EpisodeFormDialog
          open
          onOpenChange={closeDialog}
          seasons={options.seasons}
          defaultSeasonId={dialog.parentId}
          onCreated={onCreated}
        />
      )}
      {dialog?.type === 'exercise' && (
        <ExerciseFormDialog
          open
          onOpenChange={closeDialog}
          episodes={options.episodes}
          defaultEpisodeId={dialog.parentId}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}
