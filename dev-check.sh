#!/usr/bin/env bash
# dev-check.sh — Verifies Docker, Postgres, port 5432, backend /health, and Prisma DB connection.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_PORT="${PORT:-4000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FAILED=0

msg_ok()   { printf "${GREEN}✓ %s${NC}\n" "$1"; }
msg_fail() { printf "${RED}✗ %s${NC}\n" "$1"; FAILED=1; }
msg_step() { printf "\n${YELLOW}→ %s${NC}\n" "$1"; }

# 1. Docker running
msg_step "Checking Docker is running..."
if docker info &>/dev/null; then
  msg_ok "Docker is running"
else
  msg_fail "Docker is not running or not accessible"
fi

# 2. Postgres container running
msg_step "Checking Postgres container is running..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qi postgres; then
  msg_ok "Postgres container is running"
else
  msg_fail "No Postgres container found (docker ps)"
fi

# 3. Port 5432 open
msg_step "Checking port 5432 is open..."
if command -v nc &>/dev/null; then
  if nc -z localhost 5432 2>/dev/null; then
    msg_ok "Port 5432 is open"
  else
    msg_fail "Port 5432 is not open (cannot connect to localhost:5432)"
  fi
else
  if (echo >/dev/tcp/localhost/5432) 2>/dev/null; then
    msg_ok "Port 5432 is open"
  else
    msg_fail "Port 5432 is not open (cannot connect to localhost:5432)"
  fi
fi

# 4. Backend responding on /health
msg_step "Checking backend responds on /health..."
if curl -sf "http://localhost:${BACKEND_PORT}/health" &>/dev/null; then
  msg_ok "Backend is responding on http://localhost:${BACKEND_PORT}/health"
else
  msg_fail "Backend not responding on http://localhost:${BACKEND_PORT}/health (is it started?)"
fi

# 5. Prisma able to connect to DB
msg_step "Checking Prisma can connect to the database..."
if [[ -d "$BACKEND_DIR" ]]; then
  if (cd "$BACKEND_DIR" && echo "SELECT 1" | npx prisma db execute --stdin &>/dev/null); then
    msg_ok "Prisma can connect to the database"
  else
    msg_fail "Prisma could not connect to the database (check DATABASE_URL and Postgres)"
  fi
else
  msg_fail "Backend directory not found: $BACKEND_DIR"
fi

echo ""
if [[ $FAILED -eq 0 ]]; then
  printf "${GREEN}All checks passed.${NC}\n"
  exit 0
else
  printf "${RED}Some checks failed.${NC}\n"
  exit 1
fi
