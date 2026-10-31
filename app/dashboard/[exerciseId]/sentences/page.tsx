'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SentenceList from '@/app/components/sentences/SentenceList';
import ExportMenu from '@/app/components/sentences/ExportMenu';
import type { MySentencesResponse } from '@/lib/types';

type PageStatus = 'loading' | 'ready' | 'not-found' | 'error';

export default function MySentencesPage() {
  const router = useRouter();
  const params = useParams();
  const exerciseId = params?.exerciseId as string;

  const [data, setData] = useState<MySentencesResponse | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  // Session-only preference (not persisted), off by default.
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!exerciseId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/practice/${exerciseId}/sentences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;

        if (res.status === 401) {
          router.push('/');
          return;
        }
        if (res.status === 404) {
          setStatus('not-found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }

        const body: MySentencesResponse = await res.json();
        if (cancelled) return;
        setData(body);
        setStatus('ready');
      } catch (err) {
        console.error('Failed to load sentences:', err);
        if (!cancelled) setStatus('error');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <p className="text-gray-600">Loading your sentences...</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-xl font-semibold text-gray-900">Exercise not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-xl font-semibold text-red-600">
            Couldn&apos;t load your sentences. Please try again.
          </h1>
          <Button onClick={() => router.push(`/dashboard/${exerciseId}`)}>Back to exercise</Button>
        </div>
      </div>
    );
  }

  const { exercise, sentences } = data;
  const canExport = status === 'ready' && sentences.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 break-words">{exercise.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              My Sentences · {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/dashboard/${exerciseId}`)}>
            Back to exercise
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-original"
              checked={showOriginal}
              onCheckedChange={setShowOriginal}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Label htmlFor="show-original">Show original</Label>
          </div>
          <ExportMenu
            title={exercise.title}
            sentences={sentences}
            includeOriginal={showOriginal}
            disabled={!canExport}
          />
        </div>

        {sentences.length > 0 ? (
          <SentenceList sentences={sentences} showOriginal={showOriginal} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-gray-600">
                No sentences yet. Practice this exercise and your sentences will appear here.
              </p>
              <Button onClick={() => router.push(`/dashboard/${exerciseId}/practice`)}>
                Start practicing
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
