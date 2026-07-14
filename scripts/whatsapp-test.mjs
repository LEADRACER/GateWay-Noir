/**
 * Quick WhatsApp connection test + handler lookup
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read env
const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(url, key);

async function main() {
  // Check who HGCD's handler is
  const { data: hgcr } = await supabase.from('User').select('*, Handler:handler(displayName, badgeCode, phone, role)').eq('badgeCode', 'AGT-HGCR').single();
  console.log('HGCR + handler:', JSON.stringify(hgcr, null, 2));

  // Check if the announcer can process notifications — check for any pending
  const { data: pendingElev } = await supabase.from('ElevationRequest').select('id, status, notified').eq('notified', false);
  console.log('Pending elevations:', JSON.stringify(pendingElev, null, 2));

  const { data: pendingTasks } = await supabase.from('AgentTask').select('id, status, notified').eq('notified', false);
  console.log('Pending tasks:', JSON.stringify(pendingTasks, null, 2));

  const { data: pendingTopics } = await supabase.from('Topic').select('id, status, announced').eq('announced', false);
  console.log('Pending topics:', JSON.stringify(pendingTopics, null, 2));
}
main().catch(console.error);
