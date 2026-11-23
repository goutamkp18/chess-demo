import { supabase } from '../src/config/supabase.js';

async function seed() {
  console.log('Seeding initial official tournament & player records into Supabase...');

  // 1. Seed Grandmaster Players
  const initialPlayers = [
    { name: 'Magnus Carlsen', email: 'magnus@chess.com', country: 'Norway', current_rating: 2832 },
    { name: 'Hikaru Nakamura', email: 'hikaru@chess.com', country: 'United States', current_rating: 2802 },
    { name: 'Arjun Erigaisi', email: 'arjun@chess.com', country: 'India', current_rating: 2797 },
    { name: 'Gukesh D', email: 'gukesh@chess.com', country: 'India', current_rating: 2794 },
    { name: 'Nodirbek Abdusattorov', email: 'nodirbek@chess.com', country: 'Uzbekistan', current_rating: 2783 },
    { name: 'Alireza Firouzja', email: 'alireza@chess.com', country: 'France', current_rating: 2767 },
    { name: 'Goutam Poojari', email: 'goutampoojari031@gmail.com', country: 'India', current_rating: 1628 }
  ];

  for (const p of initialPlayers) {
    const { data: existing } = await supabase
      .from('player')
      .select('player_id')
      .eq('email', p.email)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await supabase.from('player').insert(p).select('player_id').single();
      if (error) console.warn('Player insert error:', error.message);
      else console.log(`Created player: ${p.name} (ID: ${created.player_id})`);
    } else {
      console.log(`Player already exists: ${p.name}`);
    }
  }

  // 2. Link Goutam Poojari player_id in user_profiles
  const { data: goutamPlayer } = await supabase
    .from('player')
    .select('player_id')
    .eq('email', 'goutampoojari031@gmail.com')
    .maybeSingle();

  if (goutamPlayer) {
    const { error: linkErr } = await supabase
      .from('user_profiles')
      .update({ player_id: goutamPlayer.player_id })
      .eq('email', 'goutampoojari031@gmail.com');

    if (linkErr) console.warn('Link player error:', linkErr.message);
    else console.log(`Linked player_id ${goutamPlayer.player_id} to user_profiles for goutampoojari031@gmail.com`);
  }

  // 3. Seed Official Tournaments
  const initialTournaments = [
    {
      name: 'Chess Magic Grand Championship 2026',
      format: 'ROUND_ROBIN',
      start_date: '2026-03-01',
      end_date: '2026-03-15',
      status: 'ONGOING'
    },
    {
      name: 'National Masters Blitz Cup',
      format: 'SWISS',
      start_date: '2026-04-10',
      end_date: '2026-04-12',
      status: 'UPCOMING'
    },
    {
      name: 'RVCE Invitational Open',
      format: 'KNOCKOUT',
      start_date: '2026-05-01',
      end_date: '2026-05-05',
      status: 'UPCOMING'
    },
    {
      name: 'Bengaluru Classical League',
      format: 'ROUND_ROBIN',
      start_date: '2026-06-01',
      end_date: '2026-06-20',
      status: 'UPCOMING'
    }
  ];

  for (const t of initialTournaments) {
    const { data: existing } = await supabase
      .from('tournament')
      .select('tournament_id')
      .eq('name', t.name)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await supabase.from('tournament').insert(t).select('tournament_id').single();
      if (error) console.warn('Tournament insert error:', error.message);
      else console.log(`Created tournament: ${t.name} (ID: ${created.tournament_id})`);
    } else {
      console.log(`Tournament already exists: ${t.name}`);
    }
  }

  // 4. Register Goutam Poojari into Chess Magic Grand Championship 2026
  if (goutamPlayer) {
    const { data: firstTourn } = await supabase
      .from('tournament')
      .select('tournament_id')
      .eq('name', 'Chess Magic Grand Championship 2026')
      .maybeSingle();

    if (firstTourn) {
      const { data: existingReg } = await supabase
        .from('registration')
        .select('registration_id')
        .eq('tournament_id', firstTourn.tournament_id)
        .eq('player_id', goutamPlayer.player_id)
        .maybeSingle();

      if (!existingReg) {
        await supabase.from('registration').insert({
          tournament_id: firstTourn.tournament_id,
          player_id: goutamPlayer.player_id
        });
        console.log(`Registered player ${goutamPlayer.player_id} into tournament ${firstTourn.tournament_id}`);
      }
    }
  }

  console.log('Seeding completed successfully!');
}

seed().catch(console.error);
