import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const clubs = [
  {
    id: 'robotics',
    name: 'Robotics Club',
    bio: 'We build and program robots for competitions, research, and innovation.',
    image: 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b',
  },
  {
    id: 'music',
    name: 'Music Club',
    bio: 'A creative space for musicians, jam sessions, and performances.',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
  },
  {
    id: 'sports',
    name: 'Sports Club',
    bio: 'Promoting fitness, teamwork, and competitive sports.',
    image: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d',
  },
  {
    id: 'ai',
    name: 'AI Society',
    bio: 'Exploring artificial intelligence, ML, and data science.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
  },
  {
    id: 'photography',
    name: 'Photography Club',
    bio: 'Capturing moments and telling stories through photography.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  },
  {
    id: 'drama',
    name: 'Drama Club',
    bio: 'Creating and performing theatrical plays, skits, and stage productions.',
    image: 'https://images.unsplash.com/photo-1515165562835-c3b8c97dcbdb',
  },
  {
    id: 'literature',
    name: 'Literature Club',
    bio: 'Exploring novels, poetry, and creative writing while fostering discussion.',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
  },
  {
    id: 'entrepreneurship',
    name: 'Startup Club',
    bio: 'Encouraging innovation, business ideas, and startup projects.',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd',
  },
  {
    id: 'environment',
    name: 'Environment Club',
    bio: 'Promoting sustainability, green initiatives, and environmental awareness.',
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6',
  },
  {
    id: 'it',
    name: 'IT Club',
    bio: 'Focusing on programming, software development, and tech projects.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
  },
];

async function seedClubs() {
  const payload = clubs.map((club) => ({
    id: club.id,
    name: club.name,
    bio: club.bio,
    image: club.image,
    followers: [],
    posts: [],
  }));

  const { error } = await supabase.from('clubs').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  console.log(`Seeded ${payload.length} clubs.`);
}

seedClubs().catch((error) => {
  console.error('Failed to seed clubs:', error);
  process.exit(1);
});
