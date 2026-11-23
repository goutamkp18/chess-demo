import { supabase } from '../src/config/supabase.js';

async function main() {
  const { data: users } = await supabase.from('user_profiles').select('*');
  console.log('user_profiles:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
