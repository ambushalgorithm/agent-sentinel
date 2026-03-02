# Agent Sentinel - Stealth Updates TODO

## Goal
Make the honeypot more stealthy/realistic to better test AI agent susceptibility to prompt injection attacks.

## Completed Changes

### 1. Hostname (payload-server → skill-registry) ✅
- [x] Rename service: `payload-server` → `skill-registry`
- [x] Update docker-compose service names
- [x] Update internal DNS references

### 2. Port (4000 → 8443) ✅
- [x] Change port from 4000 to 8443 (common for secure registries)
- [x] Update docker-compose port mappings
- [x] Update Caddyfile for HTTPS on 443 → 8443

### 3. URL Paths ✅
- [x] `/install-basic.sh` → `/v1/install?skill=demo-skill`
- [x] `/setup-basic.html` → `/setup/basic`
- [x] Update attack-lab server.js routes
- [x] Update payload-server (skill-registry) route handlers

### 4. Webpage Design (Make it look legitimate) ✅
- [x] Update attack-lab HTML pages to look like real npm package docs
- [x] Add package.json metadata display (name, version, author)
- [x] Add installation instruction: "Run: curl -sL {URL} | bash" (not npm install)
- [x] Professional styling (neutral colors, not "Attack Lab")
- [x] Add badges, stars, download counts
- [x] Update color scheme (neutral/professional, not suspicious)
- [x] Add legitimate-looking README content
- [x] Make the prompt injection less obvious in the HTML comments

### 4. Victim-Agent ✅
- [x] Update URL patterns it looks for
- [x] Test regex extraction for new URL format
- [x] Make victim-agent run continuously in loop (every 5 min)
- [x] Kill victim-agent (not needed for production)

### 5. Caddyfile ✅
- [x] Update domain routing for new service names
- [x] Fix Caddy to use Docker bridge IP (172.17.0.1)

### 6. Public URLs ✅
- [x] Add PUBLIC_SKILL_REGISTRY_URL to attack-lab
- [x] Add PUBLIC_SENTINEL_URL to payload-server (skill-registry)
- [x] Install scripts now hit public sentinel URL

### 7. Deploy & Verify ✅
- [x] Deploy to QA1 multi-domain-docker
- [x] Verify dashboard shows hits with new URLs

---

## Current Work: Unit Tests & E2E Tests

### Unit Tests (Local)
- [ ] Update attack-lab tests for new routes
- [ ] Update payload-server tests for new routes
- [ ] Run tests: `npm test`

### E2E Tests (QA1)
- [ ] Update e2e tests for new URL patterns
- [ ] Run e2e tests on QA1

---

## Files to Modify

| File | Changes |
|------|---------|
| `attack-lab/test/*.test.js` | Update route tests |
| `payload-server/test/*.test.js` | Update route tests |
| `e2e/test/*.test.js` | Update E2E tests |

## Status

- [x] stealth updates complete
- [ ] unit tests update & run
- [ ] e2e tests update & run
