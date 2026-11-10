'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Clock,
  Flame,
  Headphones,
  Lightbulb,
  Play,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressValue } from '@/components/ui/progress';

interface DashboardStats {
  today: string;
  todayStats: {
    practiceSeconds: number;
    sentencesPracticed: number;
    avgAccuracy: number | null;
    notesCreated: number;
  };
  streakDays: number;
  weeklyTrend: { date: string; sentences: number; avgAccuracy: number | null }[];
  totals: {
    sentencesPracticed: number;
    notes: number;
    exercisesCompleted: number;
  };
  continuePracticing: {
    exerciseId: string;
    title: string;
    seriesTitle: string;
    episodeNumber: number;
    currentSentenceIndex: number;
    totalSentences: number;
    lastAttemptDate: string;
  }[];
  lastPracticed: {
    exerciseId: string;
    title: string;
    seriesTitle: string;
    episodeNumber: number;
    currentSentenceIndex: number;
    totalSentences: number;
    lastAttemptDate: string;
  } | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load');
        setStats(json.data);
      } catch {
        setFailed(true);
      }
    };
    load();
  }, []);

  if (failed) return null;

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const { todayStats, lastPracticed } = stats;

  const continuePracticing = stats.continuePracticing.filter(
    (item) => item.exerciseId !== lastPracticed?.exerciseId
  );

  const statCards = [
    {
      label: 'Practice time today',
      value: formatDuration(todayStats.practiceSeconds),
      icon: Clock,
      chip: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Sentences today',
      value: String(todayStats.sentencesPracticed),
      icon: Headphones,
      chip: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Accuracy today',
      value: todayStats.avgAccuracy === null ? '—' : `${todayStats.avgAccuracy}%`,
      icon: Target,
      chip: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Notes today',
      value: String(todayStats.notesCreated),
      icon: Lightbulb,
      chip: 'bg-violet-50 text-violet-600',
    },
  ];

  // Build a full 7-day window ending today, filling quiet days with zero.
  const trendByDate = new Map(stats.weeklyTrend.map((d) => [d.date, d]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${stats.today}T00:00:00`);
    date.setDate(date.getDate() - (6 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    const entry = trendByDate.get(key);
    return {
      date: key,
      sentences: entry?.sentences ?? 0,
      avgAccuracy: entry?.avgAccuracy ?? null,
      isToday: i === 6,
    };
  });
  const maxSentences = Math.max(...week.map((d) => d.sentences), 1);

  return (
    <div className="space-y-6">
      {/* Jump back into the most recently practiced exercise */}
      {lastPracticed && (
        <Link
          href={`/dashboard/${lastPracticed.exerciseId}/practice`}
          className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 transition-colors hover:bg-blue-100"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-600">Jump back in</p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {lastPracticed.title}
            </p>
            <p className="truncate text-xs text-gray-500">
              {lastPracticed.seriesTitle} · Episode {lastPracticed.episodeNumber} ·{' '}
              {Math.min(lastPracticed.currentSentenceIndex + 1, lastPracticed.totalSentences)}/
              {lastPracticed.totalSentences} sentences
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
            <Play className="h-4 w-4" />
            Resume
          </span>
        </Link>
      )}

      {/* Today at a glance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, chip }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
                <p className="truncate text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-stretch gap-3">
              {week.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      day.sentences > 0 ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    {day.sentences > 0 ? day.sentences : ''}
                  </span>
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      title={
                        day.avgAccuracy === null
                          ? `${day.date}: no practice`
                          : `${day.date}: ${day.sentences} sentences, ${day.avgAccuracy}% accuracy`
                      }
                      className={`w-full max-w-10 rounded-t-md transition-all ${
                        day.isToday
                          ? 'bg-blue-600'
                          : day.sentences > 0
                            ? 'bg-blue-200 hover:bg-blue-300'
                            : 'bg-gray-100'
                      }`}
                      style={{
                        height: `${Math.max((day.sentences / maxSentences) * 100, 4)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs ${day.isToday ? 'font-semibold text-blue-600' : 'text-gray-400'}`}
                  >
                    {day.isToday ? 'Today' : weekdayLabel(day.date)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Streak + totals */}
        <Card>
          <CardHeader>
            <CardTitle>Your journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.streakDays}
                  <span className="ml-1 text-sm font-medium text-gray-500">
                    {stats.streakDays === 1 ? 'day' : 'days'}
                  </span>
                </p>
                <p className="text-xs text-gray-500">Current streak</p>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x rounded-lg bg-gray-50 py-3 text-center">
              <div>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">
                  {stats.totals.sentencesPracticed}
                </p>
                <p className="text-xs text-gray-500">Sentences</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">
                  {stats.totals.notes}
                </p>
                <p className="text-xs text-gray-500">Knowledge</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">
                  {stats.totals.exercisesCompleted}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue practicing */}
      {continuePracticing.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Continue practicing</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {continuePracticing.map((item) => {
              const done = Math.min(item.currentSentenceIndex + 1, item.totalSentences);
              const percent = item.totalSentences > 0
                ? Math.round((done / item.totalSentences) * 100)
                : 0;
              return (
                <Card key={item.exerciseId}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="truncate text-xs text-gray-500">
                          {item.seriesTitle} · Episode {item.episodeNumber}
                        </p>
                      </div>
                      <BookOpenCheck className="h-4 w-4 shrink-0 text-gray-300" />
                    </div>
                    <Progress value={percent}>
                      <ProgressValue />
                    </Progress>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 tabular-nums">
                        {done}/{item.totalSentences} sentences
                      </span>
                      <Link
                        href={`/dashboard/${item.exerciseId}/practice`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Play className="h-3 w-3" />
                        Resume
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
