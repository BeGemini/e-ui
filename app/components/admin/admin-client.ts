import type { AdminContentTree, Difficulty } from '@/lib/types';

export interface AdminFetchResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

export async function adminFetch<T>(path: string, init?: { method?: string; body?: unknown }): Promise<AdminFetchResult<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export type FieldErrors = Record<string, string[] | undefined>;

export interface OptionItem {
  value: string;
  label: string;
}

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function seriesOptions(tree: AdminContentTree | null): OptionItem[] {
  return (tree?.series ?? []).map((s) => ({ value: s.seriesId, label: s.title }));
}

export function seasonOptions(tree: AdminContentTree | null): OptionItem[] {
  return (tree?.series ?? []).flatMap((s) =>
    s.seasons.map((se) => ({ value: se.seasonId, label: `${s.title} / S${se.seasonNumber}` }))
  );
}

export function episodeOptions(tree: AdminContentTree | null): OptionItem[] {
  return (tree?.series ?? []).flatMap((s) =>
    s.seasons.flatMap((se) =>
      se.episodes.map((ep) => ({
        value: ep.episodeId,
        label: `${s.title} / S${se.seasonNumber} / E${ep.episodeNumber} ${ep.title}`,
      }))
    )
  );
}

/** Maps a 404/409 `{ field, error }` response or 400 `{ fieldErrors }` response into field errors. */
export function toFieldErrors(data: { error?: string; field?: string; fieldErrors?: FieldErrors }): FieldErrors {
  if (data.fieldErrors) return data.fieldErrors;
  if (data.field && data.error) return { [data.field]: [data.error] };
  return {};
}
