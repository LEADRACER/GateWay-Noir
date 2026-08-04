/**
 * Noir:GateWay serious debug — AGT & DET perspective data pull
 * Queries Supabase for all role-relevant state.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const sb = createClient(url, key);

async function q(label, fn) {
  try { const r = await fn(); console.log(`\n=== ${label} ===`); console.log(JSON.stringify(r, null, 1)); }
  catch (e) { console.log(`\n=== ${label} ERROR ===`, e.message); }
}

// 1. All users with role + phone + handler
await q('USERS', async () => {
  const { data } = await sb.from('User').select('badgeCode, displayName, role, phone, handler, isAdmin, createdAt, lastSeenAt').order('createdAt', { ascending: false });
  return data;
});

// 2. Elevation requests
await q('ELEVATION REQUESTS', async () => {
  const { data } = await sb.from('ElevationRequest').select('id, userId, adminId, requestedRole, status, message, adminNote, notified, createdAt, updatedAt');
  return data;
});

// 3. Agent tasks
await q('AGENT TASKS', async () => {
  const { data } = await sb.from('AgentTask').select('id, agentId, adminId, title, description, status, notified_assigned, notified_completed, createdAt, completedAt');
  return data;
});

// 4. Topics + announce state
await q('TOPICS', async () => {
  const { data } = await sb.from('Topic').select('id, title, status, announced, createdBy, categoryId, createdAt, endsAt');
  return data;
});

// 5. Categories
await q('CATEGORIES', async () => {
  const { data } = await sb.from('Category').select('id, name');
  return data;
});
