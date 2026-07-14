import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(url, key);

async function main() {
  // Find HGCR's handler
  const { data: hgcr } = await supabase.from('User').select('*').eq('badgeCode', 'AGT-HGCR').single();
  console.log('HGCR handler ID:', hgcr?.handler);

  if (hgcr?.handler) {
    const { data: h } = await supabase.from('User').select('badgeCode, displayName, phone, role').eq('id', hgcr.handler).single();
    console.log('Handler:', JSON.stringify(h, null, 2));
  }

  // Also find Akhil's record
  const { data: akhil } = await supabase.from('User').select('*').eq('displayName', 'Akhil').single();
  console.log('Akhil:', JSON.stringify(akhil, null, 2));
}
main().catch(console.error);
