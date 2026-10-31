export function seasonLabel(season: { seasonNumber: number; title?: string | null }): string {
  return season.title?.trim() || `Season ${season.seasonNumber}`;
}
