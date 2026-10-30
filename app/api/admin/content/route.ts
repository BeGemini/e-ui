import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { initializeDatabase, query } from '@/lib/db';
import type {
  AdminContentTree,
  AdminEpisodeNode,
  AdminExerciseNode,
  AdminSeasonNode,
  AdminSeriesNode,
  Difficulty,
} from '@/lib/types';
import { serverError } from '../_shared';

interface SeriesRow {
  seriesId: string;
  title: string;
  difficulty: Difficulty;
  totalEpisodes: number;
}
interface SeasonRow {
  seasonId: string;
  seriesId: string;
  seasonNumber: number;
  totalEpisodes: number;
}
interface EpisodeRow {
  episodeId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  totalExercises: number;
}
interface ExerciseRow extends AdminExerciseNode {
  episodeId: string;
}

function groupBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  for (const row of rows) {
    const list = map.get(row[key]);
    if (list) list.push(row);
    else map.set(row[key], [row]);
  }
  return map;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  try {
    await initializeDatabase();

    const [series, seasons, episodes, exercises] = await Promise.all([
      query<SeriesRow>('SELECT seriesId, title, difficulty, totalEpisodes FROM Series ORDER BY title'),
      query<SeasonRow>('SELECT seasonId, seriesId, seasonNumber, totalEpisodes FROM Season ORDER BY seasonNumber'),
      query<EpisodeRow>(
        'SELECT episodeId, seasonId, episodeNumber, title, totalExercises FROM Episode ORDER BY episodeNumber'
      ),
      query<ExerciseRow>(
        `SELECT exerciseId, episodeId, title, subtitleFormat, totalSentences, durationSeconds
         FROM Exercise ORDER BY createdDate`
      ),
    ]);

    const exercisesByEpisode = groupBy(exercises, 'episodeId');
    const episodesBySeason = groupBy(episodes, 'seasonId');
    const seasonsBySeries = groupBy(seasons, 'seriesId');

    const tree: AdminContentTree = {
      series: series.map<AdminSeriesNode>((s) => ({
        seriesId: s.seriesId,
        title: s.title,
        difficulty: s.difficulty,
        totalEpisodes: s.totalEpisodes,
        seasons: (seasonsBySeries.get(s.seriesId) ?? []).map<AdminSeasonNode>((se) => ({
          seasonId: se.seasonId,
          seasonNumber: se.seasonNumber,
          totalEpisodes: se.totalEpisodes,
          episodes: (episodesBySeason.get(se.seasonId) ?? []).map<AdminEpisodeNode>((ep) => ({
            episodeId: ep.episodeId,
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            totalExercises: ep.totalExercises,
            exercises: (exercisesByEpisode.get(ep.episodeId) ?? []).map<AdminExerciseNode>((ex) => ({
              exerciseId: ex.exerciseId,
              title: ex.title,
              subtitleFormat: ex.subtitleFormat,
              totalSentences: ex.totalSentences,
              durationSeconds: ex.durationSeconds,
            })),
          })),
        })),
      })),
    };

    return NextResponse.json(tree);
  } catch (error) {
    return serverError(error);
  }
}
