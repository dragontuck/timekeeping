#!/usr/bin/env bash
# ============================================================================
# setup.sh – Full first-run setup for the TimeKeeping application
# Run from the repository root: bash scripts/setup.sh
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

banner() {
cat << 'BANNER'
  _____ _            _  __                _
 |_   _(_)_ __  ___ | |/ /___  ___ _ __ (_)_ __   __ _
   | | | | '_ \/ _ \| ' // _ \/ _ \ '_ \| | '_ \ / _` |
   | | | | | | \  __/| . \  __/  __/ |_) | | | | | (_| |
   |_| |_|_| |_|\___||_|\_\___|\___| .__/|_|_| |_|\__, |
                                    |_|            |___/
        Consulting Time Management – Setup Script
BANNER
}

banner
echo ""

# ─── Prerequisites check ─────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v docker   >/dev/null 2>&1 || error "Docker is not installed. Visit https://docs.docker.com/get-docker/"
command -v openssl  >/dev/null 2>&1 || error "OpenSSL is not installed."
command -v node     >/dev/null 2>&1 || warn  "Node.js not found locally (only needed outside Docker)"
command -v psql     >/dev/null 2>&1 || warn  "psql not found – ensure PostgreSQL is running on the host"

success "Prerequisites OK"

# ─── Environment file ────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example..."
  cp .env.example .env

  # Generate cryptographically random secrets
  ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
  REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null || openssl rand -hex 64)
  ENC_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/CHANGE_ME_GENERATE_RANDOM_64_BYTE_HEX_ACCESS/$ACCESS_SECRET/" .env
    sed -i '' "s/CHANGE_ME_GENERATE_RANDOM_64_BYTE_HEX_REFRESH/$REFRESH_SECRET/" .env
    sed -i '' "s/CHANGE_ME_GENERATE_RANDOM_32_BYTE_HEX/$ENC_KEY/" .env
  else
    sed -i "s/CHANGE_ME_GENERATE_RANDOM_64_BYTE_HEX_ACCESS/$ACCESS_SECRET/" .env
    sed -i "s/CHANGE_ME_GENERATE_RANDOM_64_BYTE_HEX_REFRESH/$REFRESH_SECRET/" .env
    sed -i "s/CHANGE_ME_GENERATE_RANDOM_32_BYTE_HEX/$ENC_KEY/" .env
  fi

  warn ".env created – PLEASE update DATABASE_URL before starting."
else
  success ".env already exists, skipping."
fi

# ─── api/.env (Prisma CLI needs it in the api directory) ─────────────────────
# Prisma looks for .env in the CWD; symlink to root .env so `npx prisma ...`
# works when run from api/ without duplicating secrets.
if [[ ! -e api/.env ]]; then
  # Prefer a symlink; fall back to a copy on systems that disallow symlinks
  if ln -sf "$REPO_ROOT/.env" api/.env 2>/dev/null; then
    success "api/.env → root .env (symlink)"
  else
    cp .env api/.env
    warn "api/.env copied from root .env (symlinks unavailable). Re-run setup after editing .env."
  fi
else
  success "api/.env already exists, skipping."
fi

# ─── TLS Certificates ────────────────────────────────────────────────────────
if [[ ! -f nginx/certs/timekeeping.crt ]]; then
  info "Generating TLS certificates..."
  bash nginx/generate-certs.sh
  success "Certificates generated."
else
  success "TLS certificates already exist, skipping."
fi

# ─── PostgreSQL setup on host ────────────────────────────────────────────────
info "Setting up PostgreSQL database on host..."

if command -v psql >/dev/null 2>&1; then
  PG_USER=$(grep DB_USER .env | cut -d= -f2 2>/dev/null || echo "tk_user")
  PG_PASS=$(grep DB_PASS .env | cut -d= -f2 2>/dev/null || echo "CHANGE_ME")
  PG_NAME=$(grep DB_NAME .env | cut -d= -f2 2>/dev/null || echo "timekeeping")

  warn "Run these commands in psql as a superuser to create the database user and DB:"
  echo ""
  echo "  CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';"
  echo "  CREATE DATABASE $PG_NAME OWNER $PG_USER;"
  echo "  GRANT ALL PRIVILEGES ON DATABASE $PG_NAME TO $PG_USER;"
  echo ""
  warn "Also ensure pg_hba.conf allows connections from the Docker bridge (172.17.0.0/16)."
  warn "Typically add:  host  timekeeping  tk_user  172.17.0.0/16  md5"
else
  warn "psql not found – manually create the database. See docs/architecture.md §Database Setup."
fi

# ─── Install API dependencies ─────────────────────────────────────────────────
if [[ -d api/node_modules ]]; then
  success "API node_modules already exist."
else
  info "Installing API dependencies..."
  (cd api && npm install)
  success "API dependencies installed."
fi

# ─── Install Web dependencies ─────────────────────────────────────────────────
if [[ -d web/node_modules ]]; then
  success "Web node_modules already exist."
else
  info "Installing Web dependencies..."
  (cd web && npm install)
  success "Web dependencies installed."
fi

# ─── Hosts file reminder ──────────────────────────────────────────────────────
echo ""
warn "Add the following to your hosts file:"
echo "   127.0.0.1  web.timekeeping.local"
echo "   127.0.0.1  api.timekeeping.local"
echo "   127.0.0.1  timekeeping.local"
echo ""
echo "  Linux/Mac : /etc/hosts"
echo "  Windows   : C:\\Windows\\System32\\drivers\\etc\\hosts"

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
success "Setup complete!"
echo "============================================================"
echo ""
echo " Next steps:"
echo "  1. Edit .env (database URL, Gmail credentials)"
echo "  2. Trust nginx/certs/ca.crt on your OS (see output above)"
echo "  3. Add hosts entries (see above)"
echo "  4. Run database migrations:"
echo "       cd api && npx prisma migrate deploy && npx prisma db seed"
echo "  5. Start the stack:"
echo "       docker compose up --build -d"
echo "  6. Open https://web.timekeeping.local"
echo "     Default admin: admin@timekeeping.local / Admin@123!"
echo "     CHANGE THE PASSWORD IMMEDIATELY."
echo ""
