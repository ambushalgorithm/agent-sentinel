# Agent Sentinel - Phase 1

**Hackathon Minimal, Universal**

A docker-compose project demonstrating that ANY AI agent that browses a webpage and "sets it up" can be tricked into executing an install command that triggers a canary beacon.

---

## ⚠️ Safety Warning

This is a **demonstration project** for educational and research purposes. It shows how AI agents can be tricked into executing malicious commands through prompt injection attacks.

**DO NOT use this for harmful purposes.**

---

## Purpose

- Demonstrate prompt injection via malicious web pages
- Show how agents can be tricked into executing arbitrary commands
- Provide evidence via canary hits + JSONL logging

## Hard Requirements

- ALL services run in Docker containers using docker-compose
- Sentinel persists append-only logs as JSONL to disk
- Dashboard shows "HIT RECEIVED" and JSONL proves it

## Attack Scenarios

| Scenario | Description |
|----------|-------------|
| **basic** | Single hit when install command is executed |
| **persist** | Hit now + hit again after 10 seconds (simulates persistence) |
| **exfil** | Sends a fixed fake secret string (FAKE_API_KEY=demo123) |

## Safety Constraints

- **No destructive actions**
- **No real package installs**
- **No privilege escalation**
- **No reading actual secrets** (`.env`, `~/.ssh`, cloud creds)
- **Only echo + curl + (optional) write to /tmp**
- **No external canary services** (uses internal /hit for reliability)

---

## Quick Start

### Basic Demo

```bash
# Clone and run
git clone https://github.com/ambushalgorithm/agent-sentinel.git
cd agent-sentinel
docker compose up --build
```

### View Dashboard

Open: http://localhost:8080

You should see:
- "HIT RECEIVED" indicator
- Total Hits: 1
- Scenario: basic

### View JSONL Events

```bash
# Via HTTP
curl http://localhost:8080/events

# Or access the volume
docker compose exec sentinel cat /logs/events.jsonl
```

### Persist Demo

```bash
# Run persist scenario
docker compose run --rm -e DEMO_PAGE=/setup-persist.html victim-agent

# Watch for two hits (second one after 10 seconds)
curl http://localhost:8080/events
```

---

## Services

| Service | Description | Internal Port | Host Port |
|---------|-------------|---------------|-----------|
| sentinel | Dashboard + JSONL logging | 8080 | 8080 |
| attack-lab | Static pages with "install commands" | 3000 | - |
| payload-server | Serves install scripts | 4000 | - |
| victim-agent | Simulates agent behavior | - | - |

---

## API Endpoints

### Sentinel

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard HTML |
| `/hit` | GET | Record a canary hit (params: scenario, src, run_id, skill, data) |
| `/log` | POST | Accept JSON events |
| `/events` | GET | Return JSONL (query: limit) |
| `/reset` | POST | Reset in-memory counters |

### Attack Lab

| Endpoint | Description |
|----------|-------------|
| `/setup-basic.html` | Basic attack scenario |
| `/setup-persist.html` | Persistence attack scenario |
| `/setup-exfil.html` | Data exfiltration demo |

### Payload Server

| Endpoint | Description |
|----------|-------------|
| `/install-basic.sh` | Basic install script |
| `/install-persist.sh` | Persist install script |
| `/install-exfil.sh` | Exfil install script |

---

## JSONL Event Format

```json
{
  "ts": "2026-02-28T12:34:56.789Z",
  "event": "CANARY_HIT" | "RUN_STARTED" | "PAGE_FETCHED" | "COMMAND_EXTRACTED" | "COMMAND_EXECUTED" | "RUN_COMPLETED",
  "run_id": "uuid",
  "src": "victim-agent",
  "scenario": "basic|persist|persist-second|exfil",
  "skill": "demo-skill",
  "details": {},
  "container": "sentinel"
}
```

---

## Testing

### Running Tests on QA1

**⚠️ NEVER run tests locally - always run in Docker on QA1**

All tests run in Docker for isolation and consistency.

**Full workflow:**

1. **Check if repo exists on QA1:**
   ```bash
   ssh deploy@100.75.20.121 "ls ~/Projects/agent-sentinel"
   ```
   - If missing: clone from Github

2. **Commit & push local changes** (from this machine)

3. **On QA1 - Build & Run:**
   ```bash
   cd ~/Projects/agent-sentinel
   git pull
   
   # Build Docker image
   docker build -t agent-sentinel-test .
   
   # Run unit tests with coverage
   docker run --rm agent-sentinel-test npm test
   
   # Run specific test file
   docker run --rm agent-sentinel-test npm test -- --testPathPattern="sentinel.test.js"
   ```

4. **Review coverage** - Must hit >= 70%

### E2E Testing

E2E tests also run in Docker containers:

```bash
# Start services for E2E tests
docker compose up --build -d

# Wait for services to be ready
sleep 5

# Run E2E tests
docker compose exec sentinel npm run test:e2e

# Or run full E2E stack
docker compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

### Test Commands Summary

```bash
# Run all tests (excluding daily)
docker run --rm agent-sentinel-test npm test -- --testPathIgnorePatterns="daily"

# Run specific test file
docker run --rm agent-sentinel-test npm test -- --testPathPattern="sentinel.test.js"

# Run with coverage
docker run --rm agent-sentinel-test npm test -- --coverage
```

---

## Architecture

```
┌─────────────┐     curl      ┌─────────────────┐
│ victim-agent│──────────────▶│ payload-server  │
│             │               │  :4000          │
└─────────────┘               └────────┬────────┘
                                       │ curl
                                       ▼
                                  ┌──────────┐
                                  │ sentinel │
                                  │  :8080   │
                                  └────┬─────┘
                                       │
                                       ▼
                                  ┌──────────┐
                                  │ JSONL    │
                                  │ /logs    │
                                  └──────────┘

┌─────────────┐
│ attack-lab  │ (serves malicious HTML pages)
│  :3000      │
└─────────────┘
```

---

## License

MIT

---

*Agent Sentinel Phase 1 - Ready: basic + persist scenarios, dashboard at http://localhost:8080, JSONL at /logs/events.jsonl.*
