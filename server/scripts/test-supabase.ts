import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

console.log('====================================================');
console.log('♔ CHESS ARENA - SUPABASE INTEGRATION TESTER ♔');
console.log('====================================================');

if (!supabaseUrl || !supabaseKey) {
  console.log('ℹ️  No SUPABASE_URL / SUPABASE_KEY detected in environment variables.');
  console.log('   To test against a live Supabase project, set:');
  console.log('     SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co');
  console.log('     SUPABASE_SERVICE_ROLE_KEY=ey...');
  console.log('   in your server/.env file.');
  console.log('\n✓ Current Status: Chess Arena operates with local ACID persistence.');
  process.exit(0);
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function runTest() {
  try {
    const testRoomId = `TEST-${Date.now()}`;

    // 1. Test inserting into arena_rooms
    console.log(`\n1. Testing insert into public.arena_rooms (Room: ${testRoomId})...`);
    const { error: insertRoomErr } = await supabase.from('arena_rooms').insert({
      room_id: testRoomId,
      password_hash: 'test_hash',
      time_control: { initialSeconds: 600, incrementSeconds: 5, name: '10 + 5 Blitz' },
      created_at: Date.now(),
      status: 'WAITING_FOR_OPPONENT',
    });

    if (insertRoomErr) {
      console.error('❌ Insert into arena_rooms failed:', insertRoomErr.message);
      console.error('   Hint: Did you execute server/supabase_schema.sql in the Supabase SQL Editor?');
      process.exit(1);
    }
    console.log('✓ Successfully inserted room into Supabase');

    // 2. Test reading back from arena_rooms
    console.log('\n2. Testing select from public.arena_rooms...');
    const { data: roomData, error: readRoomErr } = await supabase
      .from('arena_rooms')
      .select('*')
      .eq('room_id', testRoomId)
      .single();

    if (readRoomErr || !roomData) {
      console.error('❌ Select from arena_rooms failed:', readRoomErr?.message);
      process.exit(1);
    }
    console.log('✓ Successfully queried room from Supabase:', roomData.room_id);

    // 3. Clean up test row
    console.log('\n3. Cleaning up test record...');
    await supabase.from('arena_rooms').delete().eq('room_id', testRoomId);
    console.log('✓ Cleanup complete');

    console.log('\n====================================================');
    console.log('🎉 SUPABASE INTEGRATION TEST PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Unexpected error during Supabase test:', err);
    process.exit(1);
  }
}

runTest();
