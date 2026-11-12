'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Captions, History, NotebookText, Play, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserMenu, { type UserMenuUser } from '@/app/components/user/UserMenu';
import { usePracticeProgress } from '@/app/components/layout/PracticeProgress';
import { useSubtitleEditorActions } from '@/app/components/layout/SubtitleEditorActions';

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const practiceMatch = pathname.match(/^\/dashboard\/([^/]+)\/practice\/?$/);
  const practiceExerciseId = practiceMatch?.[1] ?? null;
  const detailMatch = pathname.match(/^\/dashboard\/([^/]+)\/?$/);
  const detailExerciseId = detailMatch?.[1] ?? null;
  const subtitlesMatch = pathname.match(/^\/dashboard\/([^/]+)\/subtitles\/?$/);
  const subtitlesExerciseId = subtitlesMatch?.[1] ?? null;
  const { progress } = usePracticeProgress();
  const { autoMerge } = useSubtitleEditorActions();

  const [user, setUser] = useState<UserMenuUser | null>(null);
  const [exerciseTitle, setExerciseTitle] = useState('');

  useEffect(() => {
    if (practiceExerciseId || detailExerciseId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to load user for header:', err);
      }
    };

    loadUser();
  }, [practiceExerciseId, detailExerciseId]);

  useEffect(() => {
    const exerciseId = detailExerciseId ?? practiceExerciseId;
    if (!exerciseId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const loadExercise = async () => {
      try {
        const res = await fetch(`/api/exercises/${exerciseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setExerciseTitle(data.exercise?.title ?? '');
      } catch (err) {
        console.error('Failed to load exercise for header:', err);
      }
    };

    loadExercise();
  }, [detailExerciseId, practiceExerciseId]);

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const handleStartPractice = async () => {
    if (!detailExerciseId) return;

    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/exercises/${detailExerciseId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push(`/dashboard/${detailExerciseId}/practice`);
    } catch (err) {
      console.error('Failed to start practice:', err);
    }
  };

  return (
    <header className="relative sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Go to home page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Logo"
                className="h-10 w-10 rounded-lg"
              />
            </Link>
            {practiceExerciseId ? (
              progress && (
                <p className="text-sm font-medium text-gray-900">
                  <span className="font-normal text-gray-500">Sentence</span>{' '}
                  {progress.current + 1}
                  <span className="font-normal text-gray-500">
                    {' '}/ {progress.total} ·{' '}
                  </span>
                  {progressPercent}%
                  {exerciseTitle && (
                    <span className="font-normal text-gray-500">
                      {' '}| {exerciseTitle}
                    </span>
                  )}
                </p>
              )
            ) : detailExerciseId ? (
              exerciseTitle && (
                <p className="text-sm text-gray-600">
                  {exerciseTitle}
                </p>
              )
            ) : (
              user && (
                <p className="text-sm text-gray-600">
                  Welcome, {user.name || user.email}
                </p>
              )
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {subtitlesExerciseId ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="One-Click Merge"
                  title="Automatically merge consecutive sentences that have no ending punctuation (, . ? ! ; :)"
                  onClick={() => autoMerge?.run()}
                  disabled={!autoMerge}
                >
                  <Wand2 />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back"
                  title="Back"
                  onClick={() => router.back()}
                >
                  <ArrowLeft />
                </Button>
              </>
            ) : practiceExerciseId ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Customize Subtitles"
                  title="Customize Subtitles"
                  render={
                    <Link href={`/dashboard/${practiceExerciseId}/subtitles`} />
                  }
                  nativeButton={false}
                >
                  <Captions />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notes"
                  title="Notes"
                  render={
                    <Link
                      href={`/dashboard/${practiceExerciseId}/notes`}
                    />
                  }
                  nativeButton={false}
                >
                  <BookOpen />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="My Sentences"
                  title="My Sentences"
                  render={
                    <Link href={`/dashboard/${practiceExerciseId}/sentences`} />
                  }
                  nativeButton={false}
                >
                  <NotebookText />
                </Button>
              </>
            ) : detailExerciseId ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Start Practice"
                  title="Start Practice"
                  onClick={handleStartPractice}
                >
                  <Play />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Customize Subtitles"
                  title="Customize Subtitles"
                  render={
                    <Link href={`/dashboard/${detailExerciseId}/subtitles`} />
                  }
                  nativeButton={false}
                >
                  <Captions />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notes"
                  title="Notes"
                  render={
                    <Link
                      href={`/dashboard/${detailExerciseId}/notes`}
                    />
                  }
                  nativeButton={false}
                >
                  <BookOpen />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="View History"
                  title="View History"
                  render={
                    <Link href={`/dashboard/${detailExerciseId}/complete`} />
                  }
                  nativeButton={false}
                >
                  <History />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="My Sentences"
                  title="My Sentences"
                  render={
                    <Link href={`/dashboard/${detailExerciseId}/sentences`} />
                  }
                  nativeButton={false}
                >
                  <NotebookText />
                </Button>
              </>
            ) : (
              user && <UserMenu user={user} />
            )}
          </div>
        </div>
      </div>
      {practiceExerciseId && progress && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      )}
    </header>
  );
}
