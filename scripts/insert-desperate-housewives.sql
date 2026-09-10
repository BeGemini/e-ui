-- Insert Desperate Housewives S01E01 data

-- Insert Series
SET @seriesId = UUID();
INSERT INTO Series (seriesId, title, description, genre, difficulty, coverImageUrl)
VALUES (
  @seriesId,
  'Desperate Housewives',
  'A dramedy following four housewives on Wisteria Lane as they navigate relationships, scandals, and secrets.',
  'Drama/Comedy',
  'intermediate',
  'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/covers/Desperate_Housewives.jpg'
);

-- Insert Season
SET @seasonId = UUID();
INSERT INTO Season (seasonId, seriesId, seasonNumber, description)
VALUES (
  @seasonId,
  @seriesId,
  1,
  'Season 1'
);

-- Insert Episode
SET @episodeId = UUID();
INSERT INTO Episode (episodeId, seasonId, episodeNumber, title, description)
VALUES (
  @episodeId,
  @seasonId,
  1,
  'Pilot',
  'The series premiere introduces us to the residents of Wisteria Lane.'
);

-- Insert Exercise
SET @exerciseId = UUID();
INSERT INTO Exercise (exerciseId, episodeId, exerciseNumber, title, difficulty, videoUrl, subtitleFormat, subtitleUrl)
VALUES (
  @exerciseId,
  @episodeId,
  1,
  'Desperate Housewives - S01E01',
  'intermediate',
  'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.mp4',
  'ass',
  'https://shadowing-videos-1324158827.cos.ap-guangzhou.myqcloud.com/Desperate%20Hosewives/S01/E01.ass'
);

SELECT 'Data inserted successfully!' as status;
SELECT @seriesId as seriesId, @seasonId as seasonId, @episodeId as episodeId, @exerciseId as exerciseId;
