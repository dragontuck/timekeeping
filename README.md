# Time Keeping

A self-hosted time tracking and invoicing platform for freelancers and consultants. Track billable hours across clients and projects, generate PDF invoices, and send them via Gmail — all from a secure, containerised web application.

## Features

- **Time Tracking** — Log hours against projects with daily and weekly alert reminders
- **Client & Project Management** — Organise work by client with configurable hourly rates
- **Invoicing** — Generate professional PDF invoices from unbilled time entries; track draft → sent → paid lifecycle
- **Gmail Integration** — Send invoices and alert emails directly from your own Gmail account using App Passwords
- **Reports** — Summary and detailed reports filterable by client, project, and date range
- **Audit Logs** — Immutable record of all create/update/delete operations
- **Role-Based Access Control** — Admin and Standard user roles
- **Security-first** — JWT + httpOnly refresh cookies, bcrypt password hashing, AES-256-GCM credential encryption, Zod input validation, Helmet security headers, rate limiting

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Reverse Proxy | Nginx 1.25 (SSL termination, rate limiting) |
| Frontend | React 18, Vite 5, TypeScript 5, TailwindCSS 3, TanStack Query 5, React Router 6 |
| Backend | Node.js 20, Express 4, TypeScript 5, Prisma 5 |
| Database | PostgreSQL 16 (host machine) |
| Containerisation | Docker Compose |

## Architecture

```
Browser (HTTPS)
     │
     ▼
Nginx Reverse Proxy  (SSL termination, routing)
     │              │
     ▼              ▼
React SPA       Express API  ──── PostgreSQL 16
(port 3000)     (port 4000)       (host machine)
```

| Hostname | Service |
|----------|---------|
| `https://web.timekeeping.local` | React SPA |
| `https://api.timekeeping.local` | REST API (`/v1/`) |

## Prerequisites

- Docker 24+ and Docker Compose v2
- OpenSSL (for self-signed certificate generation)
- PostgreSQL 16 running on the host machine

## Quick Start

### 1. Clone and run setup

```bash
git clone <repo-url> && cd time-keeping
bash scripts/setup.sh
```

The setup script generates self-signed TLS certificates and scaffolds a `.env` file.

### 2. Configure environment

```bash
nano .env
```

See [Environment Variables](#environment-variables) for all options.

### 3. Prepare the database

```bash
# Create database user and schema (as PG superuser)
psql -U postgres -c "CREATE USER tk_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "CREATE DATABASE timekeeping OWNER tk_user;"

# Allow connections from the Docker bridge network (add to pg_hba.conf)
# host timekeeping tk_user 172.17.0.0/16 md5
# then: pg_ctl reload

# Run migrations and seed default data
cd api && npx prisma migrate deploy && npx prisma db seed && cd ..
```

### 4. Add local DNS entries

```bash
echo "127.0.0.1 web.timekeeping.local" | sudo tee -a /etc/hosts
echo "127.0.0.1 api.timekeeping.local" | sudo tee -a /etc/hosts
```

### 5. Trust the CA certificate

Follow the instructions printed by `scripts/setup.sh` to install the generated CA certificate in your OS/browser trust store.

### 6. Build and start

```bash
docker compose up --build -d
```

Open `https://web.timekeeping.local` and log in with the seeded admin account:

| Field | Value |
|-------|-------|
| Email | `admin@timekeeping.local` |
| Password | `Admin@123!` |

## Development (without Docker)

```bash
# Terminal 1 – API (http://localhost:4000)
cd api
cp ../.env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Terminal 2 – Web (http://localhost:5173)
cd web
npm install
npm run dev
```

## Testing

```bash
# API tests
cd api && npm test

# API test coverage
cd api && npm run test:coverage

# Web tests
cd web && npm test
```

## Environment Variables

All variables are read from `.env` at the project root and injected into the `api` container.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | API listen port (default `4000`) |
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | 64-byte hex secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | 64-byte hex secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Yes | Access token TTL, e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL, e.g. `7d` |
| `CORS_ORIGIN` | Yes | Allowed CORS origin, e.g. `https://web.timekeeping.local` |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | 64-char hex (32-byte) AES-256 key for encrypting stored Gmail App Passwords |
| `COOKIE_DOMAIN` | Yes | Cookie domain, e.g. `.timekeeping.local` |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default `60000`) |
| `RATE_LIMIT_MAX` | No | Max API requests per window (default `100`) |
| `AUTH_RATE_LIMIT_MAX` | No | Max auth requests per window (default `5`) |
| `TZ` | No | Timezone for cron jobs (default `America/New_York`) |

## API Overview

Base URL: `https://api.timekeeping.local/v1`

All endpoints (except `GET /health` and `POST /auth/login`) require an `Authorization: Bearer <access_token>` header.

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /health` |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Users | `GET/POST /users`, `GET/PATCH /users/:id`, `PATCH /users/me/password`, `PATCH /users/:id/disable` |
| Clients | `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| Time Entries | `GET/POST /time-entries`, `GET/PATCH/DELETE /time-entries/:id` |
| Reports | `GET /reports/summary`, `GET /reports/detailed` |
| Invoices | `GET/POST /invoices`, `GET/PATCH /invoices/:id`, `POST /invoices/:id/send`, `POST /invoices/:id/mark-paid` |
| Alerts | `GET/POST /alerts`, `GET/PATCH/DELETE /alerts/:id` |
| Audit Logs | `GET /audit-logs` |

See [docs/api-reference.md](docs/api-reference.md) for full request/response documentation.

## Gmail Integration

Invoices and alert emails are sent from each user's own Gmail account.

1. Enable 2-Step Verification on your Google account.
2. Generate an App Password at https://myaccount.google.com/apppasswords (choose **Mail → Other device**).
3. In the app, go to **Profile → Gmail Integration** and enter your Gmail address and the 16-character App Password.

App Passwords are stored encrypted at rest (AES-256-GCM) and are never returned through any API response.

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily alert | `0 9 * * 1-5` | Emails users who have a daily alert enabled and are missing a time entry for the day |
| Weekly alert | `0 16 * * 5` | Emails users a weekly hours summary every Friday afternoon |

## Useful Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f web

# Restart API
docker compose restart api

# Run migrations inside container
docker compose exec api npx prisma migrate deploy

# Open Prisma Studio (local dev)
cd api && npx prisma studio

# Stop all containers
docker compose down
```

## Project Structure

```
├── api/                  # Node.js / TypeScript REST API
│   ├── prisma/           # Schema, migrations, and seed data
│   └── src/
│       ├── controllers/  # Route handlers
│       ├── services/     # Business logic
│       ├── schemas/      # Zod validation schemas
│       ├── middleware/   # Auth, error handling, rate limiting
│       └── routes/       # Express router definitions
├── web/                  # React SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── contexts/
├── nginx/                # Reverse proxy config and TLS certificates
├── scripts/              # Setup automation
├── docs/                 # Architecture and API reference
└── docker-compose.yml
```

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT access tokens (15 min) + httpOnly Secure SameSite=Strict refresh cookies (7 days), rotated on each use
- All inputs validated with Zod schemas
- Helmet security headers (CSP, HSTS, X-Frame-Options)
- Express and Nginx rate limiting on all routes
- Prisma parameterised queries (no raw SQL concatenation)
- AES-256-GCM encryption for stored Gmail App Passwords
- HTTPS enforced; HTTP redirects to HTTPS with HSTS

## License

MIT
