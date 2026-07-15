const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const conv = await pool.query('SELECT id, workspace_id, agent_id, hackathon_id, is_hackathon, title, channel, created_at::text, last_message_at::text FROM conversations WHERE id = 74');
  console.log('CONV:', JSON.stringify(conv.rows));
  const stats = await pool.query("SELECT COUNT(*) as total, MIN(created_at)::text as first, MAX(created_at)::text as last, COUNT(CASE WHEN role='user' THEN 1 END) as users, COUNT(CASE WHEN role='agent' THEN 1 END) as agents FROM messages WHERE conversation_id = 74");
  console.log('STATS:', JSON.stringify(stats.rows));
  const msgs = await pool.query("SELECT id, role, LEFT(content,300) as c, created_at::text as ts FROM messages WHERE conversation_id = 74 ORDER BY created_at");
  msgs.rows.forEach(m => console.log('MSG:', JSON.stringify(m)));
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
