const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const LOG_DIR = process.env.LOG_DIR || '/logs';
const LOG_FILE = path.join(LOG_DIR, 'events.jsonl');

// In-memory stats
let stats = {
  totalHits: 0,
  lastHit: null,
  lastSrc: null,
  lastRunId: null,
  lastScenario: null,
  lastSkill: null
};

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET / - Dashboard
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Sentinel</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #e94560; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .stat-card { background: #16213e; padding: 20px; border-radius: 8px; }
    .stat-value { font-size: 2em; font-weight: bold; color: #e94560; }
    .stat-label { color: #888; margin-top: 5px; }
    .hit-received { background: #0f3460; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .hit-received h2 { color: #4ade80; margin: 0; }
    a { color: #e94560; }
  </style>
</head>
<body>
  <h1>🛡️ Agent Sentinel</h1>
  <div class="hit-received">
    <h2>${stats.totalHits > 0 ? '✓ HIT RECEIVED' : 'Waiting for hits...'}</h2>
  </div>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${stats.totalHits}</div>
      <div class="stat-label">Total Hits</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.lastScenario || '-'}</div>
      <div class="stat-label">Last Scenario</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.lastSrc || '-'}</div>
      <div class="stat-label">Last Source</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.lastRunId ? stats.lastRunId.substring(0, 8) + '...' : '-'}</div>
      <div class="stat-label">Last Run ID</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.lastSkill || '-'}</div>
      <div class="stat-label">Last Skill</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.lastHit || '-'}</div>
      <div class="stat-label">Last Hit Time</div>
    </div>
  </div>
  <p><a href="/events">View JSONL Events</a></p>
</body>
</html>
  `;
  res.send(html);
});

// GET /hit - Record a canary hit
app.get('/hit', (req, res) => {
  const { scenario, src, run_id, skill, data } = req.query;
  
  const event = {
    ts: new Date().toISOString(),
    event: 'CANARY_HIT',
    run_id: run_id || uuidv4(),
    src: src || 'unknown',
    scenario: scenario || 'unknown',
    skill: skill || 'unknown',
    details: data ? { data } : {},
    container: 'sentinel'
  };
  
  // Append to JSONL
  fs.appendFileSync(LOG_FILE, JSON.stringify(event) + '\n');
  
  // Update stats
  stats.totalHits++;
  stats.lastHit = event.ts;
  stats.lastSrc = event.src;
  stats.lastRunId = event.run_id;
  stats.lastScenario = event.scenario;
  stats.lastSkill = event.skill;
  
  res.send('ok');
});

// POST /log - Accept JSON events
app.post('/log', (req, res) => {
  const event = {
    ts: new Date().toISOString(),
    ...req.body,
    container: 'sentinel'
  };
  
  // Append to JSONL
  fs.appendFileSync(LOG_FILE, JSON.stringify(event) + '\n');
  
  // Update stats for CANARY_HIT events
  if (event.event === 'CANARY_HIT') {
    stats.totalHits++;
    stats.lastHit = event.ts;
    stats.lastSrc = event.src;
    stats.lastRunId = event.run_id;
    stats.lastScenario = event.scenario;
    stats.lastSkill = event.skill;
  }
  
  res.send('ok');
});

// GET /events - Return JSONL
app.get('/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  
  if (!fs.existsSync(LOG_FILE)) {
    return res.type('text/plain').send('');
  }
  
  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const lastLines = lines.slice(-limit);
  
  res.type('text/plain').send(lastLines.join('\n'));
});

// POST /reset - Reset in-memory stats
app.post('/reset', (req, res) => {
  stats = {
    totalHits: 0,
    lastHit: null,
    lastSrc: null,
    lastRunId: null,
    lastScenario: null,
    lastSkill: null
  };
  res.send('ok');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sentinel listening on port ${PORT}`);
  console.log(`Logging to ${LOG_FILE}`);
});

module.exports = app;
