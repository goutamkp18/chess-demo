import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://eekzwxitffjfnjzlmvwn.supabase.co',
  'sb_publishable_n7aakPYHZf5t3uGJvGvFJQ_mZbd8qqM'
);

async function test() {
  const tables = [
    'player',
    'app_user',
    'tournament',
    'tournament_round',
    'game',
    'result',
    'registration',
    'tournament_standings',
    'rating_history',
    'prediction',
    'arena_rooms',
    'arena_matches',
    'user_profiles'
  ];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    console.log(`Table '${t}':`, error ? `ERROR: ${error.message}` : `EXISTS (${data?.length} rows)`);
  }
}

test();
