import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read env from .env.prod at Noir path
const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

async function main() {
  // Find user matching HGCR
  const { data: hgcr, error: e1 } = await supabase.from('User').select('*').ilike('badgeCode', '%HGCR%');
  if (e1) { console.error('HGCR error:', e1.message); return; }
  console.log('HGCR match:', JSON.stringify(hgcr, null, 2));

  // List all users with badge codes
  const { data: all, error: e2 } = await supabase.from('User').select('badgeCode, displayName, role, phone, isAdmin').order('createdAt', { ascending: false });
  if (e2) { console.error('All error:', e2.message); return; }
  console.log('All users:', JSON.stringify(all, null, 2));

  // Check admin users
  const { data: admins, error: e3 } = await supabase.from('User').select('badgeCode, displayName, phone, isAdmin').eq('isAdmin', true);
  if (e3) { console.error('Admins error:', e3.message); return; }
  console.log('Admins:', JSON.stringify(admins, null, 2));
}

main().catch(console.error);
