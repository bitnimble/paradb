INSERT INTO maps
  (id, submission_date, title, artist, author, uploader, download_count, description, complexity, album_art)
VALUES
  ('1', timestamp '2021-06-01 00:00:00', 'All Star', 'Smash Mouth', 'anon', 'anon', 0, 'All Star is the greatest hit of all time.', 2, 'https://upload.wikimedia.org/wikipedia/en/3/30/Astro_lounge.png'),
  ('2', timestamp '2021-06-01 00:00:00', 'All Star 2', 'Smash Mouth 2', 'anon', 'anon', 0, 'All Star is the greatest hit of all time.', 2, 'https://upload.wikimedia.org/wikipedia/en/3/30/Astro_lounge.png');

INSERT INTO difficulties
  (map_id, difficulty, difficulty_name)
VALUES
  ('1', null, 'anon''s Easy'),
  ('1', null, 'Medium'),
  ('1', null, 'This map has layers'),
  ('1', null, 'Shrek is love, Shrek is life'),
  ('2', null, 'Easy'),
  ('2', null, 'Medium'),
  ('2', null, 'Hard'),
  ('2', null, 'Expert');
