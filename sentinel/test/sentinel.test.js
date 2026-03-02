/**
 * Sentinel Unit Tests
 * Tests: endpoint handlers, JSONL append, query params
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

describe('Sentinel Server', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    // Set up test log directory and port to avoid conflicts with Docker
    process.env.LOG_DIR = '/tmp/sentinel-test-logs';
    process.env.PORT = 8082;
    
    // Ensure test log dir exists
    require('fs').mkdirSync('/tmp/sentinel-test-logs', { recursive: true });
    
    // Load server after env is set
    const serverPath = path.join(__dirname, '..', 'server.js');
    delete require.cache[require.resolve(serverPath)];
    app = require(serverPath);
  }, 10000);
  
  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /', () => {
    it('should return dashboard HTML', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
      expect(res.text).toContain('Agent Sentinel');
      expect(res.text).toContain('Total Hits');
    });

    it('should show hit count in dashboard', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('0');
    });
  });

  describe('GET /hit', () => {
    it('should record a CANARY_HIT event', async () => {
      const res = await request(app).get('/hit')
        .query({
          scenario: 'basic',
          src: 'test-agent',
          run_id: 'test-run-123',
          skill: 'test-skill'
        });
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
    });

    it('should accept data parameter', async () => {
      const res = await request(app).get('/hit')
        .query({
          scenario: 'exfil',
          src: 'test-agent',
          run_id: 'test-run-456',
          skill: 'test-skill',
          data: 'FAKE_API_KEY=demo123'
        });
      
      expect(res.status).toBe(200);
    });

    it('should handle missing optional params', async () => {
      const res = await request(app).get('/hit')
        .query({ scenario: 'basic' });
      
      expect(res.status).toBe(200);
    });
  });

  describe('POST /log', () => {
    it('should accept JSON event and return ok', async () => {
      const res = await request(app)
        .post('/log')
        .send({
          event: 'RUN_STARTED',
          run_id: 'test-789',
          src: 'victim-agent',
          scenario: 'basic',
          skill: 'demo-skill'
        });
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('ok');
    });

    it('should accept event with details', async () => {
      const res = await request(app)
        .post('/log')
        .send({
          event: 'PAGE_FETCHED',
          run_id: 'test-abc',
          src: 'victim-agent',
          scenario: 'basic',
          details: { url: 'http://attack-lab:3000/setup-basic.html' }
        });
      
      expect(res.status).toBe(200);
    });
  });

  describe('GET /events', () => {
    it('should return JSONL content', async () => {
      const res = await request(app).get('/events');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/plain');
    });

    it('should accept limit parameter', async () => {
      const res = await request(app).get('/events?limit=10');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /reset', () => {
    it('should reset in-memory counters', async () => {
      // First add a hit
      await request(app).get('/hit').query({ scenario: 'basic', src: 'test', run_id: 'r1', skill: 's' });
      
      // Then reset
      const res = await request(app).post('/reset');
      expect(res.status).toBe(200);
    });
  });
});
