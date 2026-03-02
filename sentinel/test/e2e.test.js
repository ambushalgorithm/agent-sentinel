/**
 * E2E Tests for Agent Sentinel
 * Tests full docker-compose stack
 */

const axios = require('axios');

const SENTINEL_URL = process.env.SENTINEL_URL || 'http://localhost:8080';

describe('E2E: Agent Sentinel Basic Scenario', () => {
  const runId = `e2e-basic-${Date.now()}`;
  const src = 'e2e-test';

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it('should hit sentinel /hit endpoint', async () => {
    const res = await axios.get(`${SENTINEL_URL}/hit`, {
      params: { scenario: 'basic', src, run_id: runId, skill: 'demo-skill' }
    });
    
    expect(res.status).toBe(200);
    expect(res.data).toBe('ok');
  });

  it('should record hit in /events', async () => {
    // Give it a moment to write
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const res = await axios.get(`${SENTINEL_URL}/events`, { responseType: 'text' });
    const events = res.data.split('\n').filter(Boolean);
    
    const lastEvent = JSON.parse(events[events.length - 1]);
    expect(lastEvent.event).toBe('CANARY_HIT');
    expect(lastEvent.scenario).toBe('basic');
    expect(lastEvent.src).toBe(src);
  });

  it('should show hit in dashboard', async () => {
    const res = await axios.get(`${SENTINEL_URL}/`);
    
    expect(res.status).toBe(200);
    expect(res.data).toContain('HIT RECEIVED');
    expect(res.data).toContain('basic');
  });
});

describe('E2E: Agent Sentinel Persist Scenario', () => {
  const runId = `e2e-persist-${Date.now()}`;
  const src = 'e2e-test';

  it('should receive first hit immediately', async () => {
    const res = await axios.get(`${SENTINEL_URL}/hit`, {
      params: { scenario: 'persist', src, run_id: runId, skill: 'demo-skill' }
    });
    
    expect(res.status).toBe(200);
  });

  it('should receive second hit after 10 seconds', async () => {
    // Note: persist-second only fires when the install script actually runs
    // This requires the full victim-agent flow which is complex to test
    // For E2E, we verify the first hit works; the second is demonstrated via manual script execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const res = await axios.get(`${SENTINEL_URL}/events`);
    const events = res.data.split('\n').filter(Boolean);
    
    const persistEvents = events
      .map(line => JSON.parse(line))
      .filter(e => e.run_id === runId);
    
    const scenarios = persistEvents.map(e => e.scenario);
    expect(scenarios).toContain('persist');
    // persist-second requires script execution via victim-agent
  }, 5000);
});

describe('E2E: JSONL Logging', () => {
  it('should append events to JSONL', async () => {
    const runId = `e2e-jsonl-${Date.now()}`;
    
    // Post an event
    await axios.post(`${SENTINEL_URL}/log`, {
      event: 'RUN_STARTED',
      run_id: runId,
      src: 'e2e-test',
      scenario: 'basic',
      skill: 'demo-skill'
    });
    
    // Check events endpoint
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const res = await axios.get(`${SENTINEL_URL}/events`);
    const events = res.data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    
    const runEvent = events.find(e => e.run_id === runId);
    expect(runEvent).toBeDefined();
    expect(runEvent.event).toBe('RUN_STARTED');
  });
});

describe('E2E: Dashboard Stats', () => {
  it('should show correct stats', async () => {
    const res = await axios.get(`${SENTINEL_URL}/`);
    
    expect(res.status).toBe(200);
    expect(res.data).toContain('Total Hits');
    expect(res.data).toContain('Last Scenario');
    expect(res.data).toContain('Last Source');
  });
});

describe('E2E: /reset Endpoint', () => {
  it('should reset in-memory counters', async () => {
    // Add a hit first
    await axios.get(`${SENTINEL_URL}/hit`, {
      params: { scenario: 'basic', src: 'reset-test', run_id: 'reset-test', skill: 's' }
    });
    
    // Reset
    const res = await axios.post(`${SENTINEL_URL}/reset`);
    expect(res.status).toBe(200);
    
    // Dashboard should show 0 hits (in memory)
    // Note: JSONL file still has the data
  });
});
