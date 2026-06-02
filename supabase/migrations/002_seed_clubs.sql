insert into public.clubs (id, name, bio, image, followers, posts)
values
  ('robotics', 'Robotics Club', 'We build and program robots for competitions, research, and innovation.', 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b', '{}'::text[], '{}'::text[]),
  ('music', 'Music Club', 'A creative space for musicians, jam sessions, and performances.', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d', '{}'::text[], '{}'::text[]),
  ('sports', 'Sports Club', 'Promoting fitness, teamwork, and competitive sports.', 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d', '{}'::text[], '{}'::text[]),
  ('ai', 'AI Society', 'Exploring artificial intelligence, ML, and data science.', 'https://images.unsplash.com/photo-1677442136019-21780ecad995', '{}'::text[], '{}'::text[]),
  ('photography', 'Photography Club', 'Capturing moments and telling stories through photography.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', '{}'::text[], '{}'::text[]),
  ('drama', 'Drama Club', 'Creating and performing theatrical plays, skits, and stage productions.', 'https://images.unsplash.com/photo-1515165562835-c3b8c97dcbdb', '{}'::text[], '{}'::text[]),
  ('literature', 'Literature Club', 'Exploring novels, poetry, and creative writing while fostering discussion.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794', '{}'::text[], '{}'::text[]),
  ('entrepreneurship', 'Startup Club', 'Encouraging innovation, business ideas, and startup projects.', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd', '{}'::text[], '{}'::text[]),
  ('environment', 'Environment Club', 'Promoting sustainability, green initiatives, and environmental awareness.', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6', '{}'::text[], '{}'::text[]),
  ('it', 'IT Club', 'Focusing on programming, software development, and tech projects.', 'https://images.unsplash.com/photo-1518770660439-4636190af475', '{}'::text[], '{}'::text[])
on conflict (id) do update set
  name = excluded.name,
  bio = excluded.bio,
  image = excluded.image;
