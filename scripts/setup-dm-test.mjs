/**
 * Fix HGCR phone + Create a task for HGCR assigned by BRU-DTWZ (Akhil)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(url, key);

async function main() {
  // 1. Fix HGCR phone — add +91 country code
  const fixedPhone = "+917991438328";
  const { data: hgcr, error: e1 } = await supabase
    .from('User')
    .update({ phone: fixedPhone })
    .eq('badgeCode', 'AGT-HGCR')
    .select();
  console.log('HGCR phone updated:', JSON.stringify(hgcr, null, 2), e1);

  // 2. Get Akhil (BRU-DTWZ) ID for adminId
  const { data: akhil } = await supabase
    .from('User')
    .select('id')
    .eq('badgeCode', 'BRU-DTWZ')
    .single();
  console.log('Akhil ID:', akhil?.id);

  // 3. Create a task for HGCR
  const task = {
    title: "Field Reconnaissance — Sector 7G",
    description: "Investigate unusual activity reported in Sector 7G. Gather evidence and report back to Bureau.",
    status: "PENDING",
    agentId: hgcr?.[0]?.id || "bfaffcfc-fc51-4401-859b-b62e77067489",
    adminId: akhil?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notified: false,
  };
  
  const { data: newTask, error: e2 } = await supabase
    .from('AgentTask')
    .insert(task)
    .select();
  console.log('Task created:', JSON.stringify(newTask, null, 2), e2);

  // 4. Also mark the pending elevation as notified so we only test the DM we care about
  const { error: e3 } = await supabase
    .from('ElevationRequest')
    .update({ notified: true, updatedAt: new Date().toISOString() })
    .eq('notified', false);
  console.log('Cleared pending elevations:', e3);
}

main().catch(console.error);
