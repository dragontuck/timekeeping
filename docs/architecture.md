# TimeKeeping – Architecture Document

> A three-tier consulting time management platform built with React, Node/TypeScript, and PostgreSQL.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Decisions](#3-technology-decisions)
4. [Security Architecture](#4-security-architecture)
5. [Database Schema](#5-database-schema)
6. [API Design Principles](#6-api-design-principles)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Background Scheduler](#8-background-scheduler)
9. [Invoice & PDF Pipeline](#9-invoice--pdf-pipeline)
10. [Gmail Integration](#10-gmail-integration)
11. [Deployment Guide](#11-deployment-guide)
12. [Development Guide](#12-development-guide)
13. [Environment Variables Reference](#13-environment-variables-reference)

---

## 1. System Overview

```
Internet / Browser
       │  HTTPS 443
       ▼
┌──────────────────────────────────────┐
│          Docker Network              │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Nginx (Reverse Proxy)      │   │
│  │   SSL Termination            │   │
│  │   Rate Limiting              │   │
│  └───────┬──────────────────────┘   │
│           │                          │
│    ┌──────┴───────┐                 │
│    ▼              ▼                  │
│  ┌──────────┐  ┌──────────┐        │
│  │  TIER 1  │  │  TIER 2  │        │
│  │  React   │  │  Node.js │        │
│  │  + Nginx │  │  + TS    │        │
│  │  :3000   │  │  :4000   │        │
│  └──────────┘  └────┬─────┘        │
│                      │               │
└──────────────────────│───────────────┘
                        │  TCP 5432
                        ▼
              ┌──────────────────┐
              │     TIER 3       │
              │  PostgreSQL 16   │
              │  (Host Machine)  │
              └──────────────────┘
```

| Layer | Technology | Role |
|-------|-----------|------|
| Reverse Proxy | Nginx 1.25 | SSL termination, routing, rate limiting |
| Tier 1 | React 18 + Vite + TailwindCSS | Single-page application |
| Tier 2 | Node 20 + Express + TypeScript + Prisma | REST API |
| Tier 3 | PostgreSQL 16 (host) | Relational data store |

**Domain names (local):**
| Hostname | Service |
|----------|---------|
| `https://web.timekeeping.local` | React SPA |
| `https://api.timekeeping.local` | REST API |

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React SPA (React Query + React Router + Tailwind)        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                         │ HTTPS (JWT Bearer / httpOnly Cookie)
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Docker Compose Network                                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Nginx Reverse Proxy                                       │  │
│  │  • TLS 1.2 / 1.3          • HSTS                          │  │
│  │  • Gzip compression       • Rate limiting                  │  │
│  │  • X-Frame-Options        • CSP headers                    │  │
│  └──────────────┬────────────────────────┬─────────────────── ┘  │
│                 │                        │                        │
│   web.timekeeping.local     api.timekeeping.local                 │
│                 ▼                        ▼                        │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐    │
│  │  Web Container      │  │  API Container                  │    │
│  │  ─────────────────  │  │  ────────────────────────────   │    │
│  │  Nginx (static)     │  │  Express app                    │    │
│  │  React SPA build    │  │  • Auth (JWT + refresh cookie)  │    │
│  │  :3000              │  │  • RBAC middleware               │    │
│  └─────────────────────┘  │  • Zod validation               │    │
│                            │  • Prisma ORM                   │    │
│                            │  • node-cron scheduler          │    │
│                            │  • pdfkit (PDF gen)             │    │
│                            │  • nodemailer (Gmail)           │    │
│                            │  :4000                          │    │
│                            └────────────────┬────────────────┘    │
│                                             │                     │
└─────────────────────────────────────────────│─────────────────────┘
                                              │ TCP 5432
                                              ▼
                              ┌────────────────────────────────┐
                              │  PostgreSQL 16 (Host Machine)  │
                              │  Database: timekeeping         │
                              │  pg_hba: Docker bridge allowed │
                              └────────────────────────────────┘
```

---

## 3. Technology Decisions

### Tier 1 – React SPA

| Package | Version | Rationale |
|---------|---------|-----------|
| React | 18 | Concurrent features, hooks |
| Vite | 5 | Fast HMR, ESM-native build |
| TypeScript | 5 | Type safety across the stack |
| TailwindCSS | 3 | Utility-first, no CSS-in-JS overhead |
| TanStack Query | 5 | Server-state management, caching, refetch |
| React Router | 6 | SPA routing, loader pattern |
| React Hook Form | 7 | Performant forms with minimal re-renders |
| Zod | 3 | Shared validation schemas |
| Axios | 1 | HTTP client with interceptors |
| date-fns | 3 | Tree-shakeable date utilities |
| react-hot-toast | 2 | Lightweight toast notifications |

### Tier 2 – Node/TypeScript API

| Package | Version | Rationale |
|---------|---------|-----------|
| Node.js | 20 LTS | LTS stability |
| Express | 4 | Mature, ecosystem-rich |
| TypeScript | 5 | Type safety |
| Prisma | 5 | Type-safe ORM, migration management |
| Zod | 3 | Runtime validation + TypeScript inference |
| jsonwebtoken | 9 | JWT access tokens |
| bcryptjs | 2 | Password hashing (cost 12) |
| Helmet | 7 | Security headers |
| express-rate-limit | 7 | API rate limiting |
| Winston | 3 | Structured logging |
| pdfkit | 0.15 | Server-side PDF generation (no headless browser) |
| nodemailer | 6 | Gmail SMTP integration |
| node-cron | 3 | Cron job scheduling for alerts |
| compression | 1 | Gzip response compression |

### Tier 3 – PostgreSQL

- Version 16 running on host machine
- Connection pooling via Prisma (connection_limit=10)
- Indexes on all foreign keys and query-critical columns
- UUID primary keys for security (no sequential ID enumeration)

---

## 4. Security Architecture

### Authentication Flow

```
Client → [POST /auth/login] → API validates credentials
                             → Issues JWT access token (15 min, in body)
                             → Sets refresh token cookie (7 days, httpOnly, Secure, SameSite=Strict)

Client → [API call + Bearer token]
       → Token expired → [POST /auth/refresh with cookie]
       → New access token issued

Client → [POST /auth/logout] → Refresh token cleared from DB + cookie cleared
```

### Security Controls

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt cost factor 12 |
| JWT secrets | 64-byte random hex, stored in env |
| Refresh token storage | httpOnly Secure SameSite=Strict cookie |
| Refresh token DB | Hashed in DB; rotated on each use |
| Rate limiting | Auth: 10 req/min; API: 100 req/min (Nginx + Express) |
| CORS | Whitelist: `https://web.timekeeping.local` only |
| Security headers | Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Input validation | Zod schemas on every route |
| SQL injection | Prisma parameterized queries (never raw string concatenation) |
| Sensitive log data | Passwords, tokens never logged |
| HTTPS only | HTTP redirects to HTTPS; HSTS max-age=31536000 |
| File upload | Not supported; PDF generated server-side |

### Role-Based Access Control

| Action | Admin | Standard |
|--------|-------|---------|
| User CRUD | ✅ | Own profile only |
| Disable users | ✅ | ❌ |
| Client CRUD | ✅ | Read + own |
| Project CRUD | ✅ | Read + own |
| Time entries | ✅ All | Own only |
| Reports | ✅ All users | Own only |
| Alerts | Own | Own |
| Invoices | Own | Own |

---

## 5. Database Schema

```
users
  id, email, passwordHash, firstName, lastName, role,
  isActive, invoicePrefix, refreshToken (hashed), lastLoginAt

clients
  id, name, email, phone, address, city, state, zip, country,
  notes, isActive

projects
  id, clientId→clients, name, description, costPerHour, isActive

time_entries
  id, userId→users, projectId→projects, date, hours, description,
  isBilled

alerts
  id, userId→users, projectId→projects, type (DAILY|WEEKLY), isEnabled
  UNIQUE(userId, projectId, type)

invoices
  id, userId→users, clientId→clients, invoiceNumber (unique),
  status (DRAFT|OPEN|SENT|RESENT|PAID|PAID_CLOSED),
  issueDate, dueDate, periodStart, periodEnd,
  subtotal, taxRate, taxAmount, total, notes,
  sentAt, resentAt, paidAt, closedAt

invoice_items
  id, invoiceId→invoices (cascade), timeEntryId→time_entries (nullable),
  date, description, hours, rate, amount
  UNIQUE(timeEntryId)  -- prevents double-billing
```

---

## 6. API Design Principles

- **RESTful** resource-oriented URLs
- **Versioning**: all routes prefixed `/v1/`
- **Consistent response envelope**:
  ```json
  { "data": {...}, "meta": { "page": 1, "total": 42 } }
  ```
- **Error envelope**:
  ```json
  { "status": "error", "message": "...", "errors": [...] }
  ```
- **HTTP status codes**: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error
- **Pagination**: `?page=1&limit=25` on list endpoints
- **Filtering**: query params `?clientId=...&startDate=...&endDate=...`
- **Sorting**: `?sortBy=date&sortOrder=desc`

---

## 7. Authentication & Authorization

### JWT Strategy

```
Access Token:  HS256, 15-minute expiry, payload: { sub, email, role, iat, exp }
Refresh Token: HS256, 7-day expiry, stored hashed in users.refreshToken
               Delivered as httpOnly Secure SameSite=Strict cookie
               Rotated on every refresh (old token invalidated)
```

### Middleware Stack (per request)

```
Request → rateLimiter → helmet → cors → json parser → authenticate →
          authorize(role) → validate(schema) → controller → response
```

---

## 8. Background Scheduler

Implemented with `node-cron` inside the API container:

| Schedule | Cron | Purpose |
|----------|------|---------|
| Daily alerts | `0 9 * * 1-5` | Check daily time entry alerts, email missing entries |
| Weekly alerts | `0 16 * * 5` | Check weekly summaries, email summary report |

The scheduler queries `alerts` joined with `time_entries` to determine which users have missing entries for enabled alerts, then batches emails per user.

---

## 9. Invoice & PDF Pipeline

1. User selects client + date range → API fetches unbilled time entries for that client
2. User selects entries → `POST /invoices` creates `Invoice` + `InvoiceItem` records
3. Items reference `time_entries.id` (unique constraint prevents double-billing)
4. `time_entries.isBilled` is set to `true`
5. **PDF generation**: `pdfkit` renders professional invoice with header, line items, totals
6. Invoice number format: `{prefix}-{YYYY}-{NNNN}` (prefix from user settings)
7. **Send**: nodemailer attaches PDF and sends to `client.email` via Gmail SMTP

---

## 10. Gmail Integration

Gmail credentials are stored **per user** (not system-wide) so that invoices and alert emails are sent from the individual consultant's own Gmail account.

### Setup (per user)
1. Enable 2FA on your Gmail account.
2. Generate an App Password at https://myaccount.google.com/apppasswords (select "Mail" → "Other device").
3. In the application, navigate to **Profile → Gmail Integration** and enter your Gmail address and the 16-character App Password.

### Security
- The App Password is **never stored in plaintext**. It is encrypted at rest using AES-256-GCM with a server-side key (`CREDENTIAL_ENCRYPTION_KEY` env var).
- The encrypted value (`gmailAppPasswordEnc`) is **never returned** through any API endpoint.
- Only `gmailUser` (the address) is returned in user API responses.
- Sending an invoice fails gracefully with a clear error if the user has not configured Gmail credentials.

The email service sends:
- **Invoice emails**: HTML body + PDF attachment, from the invoice owner's Gmail account.
- **Alert reminders**: HTML body listing missing time entries, from the alert recipient's Gmail account.

---

## 11. Deployment Guide

### Prerequisites

- Docker 24+ and Docker Compose v2
- OpenSSL (for certificate generation)
- PostgreSQL 16 installed and running on host

### Steps

```bash
# 1. Clone repo
git clone <repo-url> && cd time-keeping

# 2. Run setup (certs + env + deps)
bash scripts/setup.sh

# 3. Edit .env
nano .env

# 4. Create PostgreSQL user and database (as PG superuser)
psql -U postgres -c "CREATE USER tk_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "CREATE DATABASE timekeeping OWNER tk_user;"

# 5. Allow Docker → host DB connections (in pg_hba.conf)
# Add: host timekeeping tk_user 172.17.0.0/16 md5
# Then: pg_ctl reload

# 6. Run migrations and seed
cd api && npx prisma migrate deploy && npx prisma db seed && cd ..

# 7. Trust the CA cert on your OS
# See output from scripts/setup.sh

# 8. Add hosts entries
echo "127.0.0.1 web.timekeeping.local" | sudo tee -a /etc/hosts
echo "127.0.0.1 api.timekeeping.local" | sudo tee -a /etc/hosts

# 9. Build and start
docker compose up --build -d

# 10. Open browser
# https://web.timekeeping.local
# Login: admin@timekeeping.local / Admin@123!
```

### Useful Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f web

# Restart API
docker compose restart api

# Run migrations
docker compose exec api npx prisma migrate deploy

# Open Prisma Studio
cd api && npx prisma studio

# Stop everything
docker compose down
```

---

## 12. Development Guide

### Local Development (without Docker)

```bash
# Terminal 1 – API
cd api
cp ../.env.example .env   # edit as needed
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev               # http://localhost:4000

# Terminal 2 – Web
cd web
npm install
npm run dev               # http://localhost:5173 (Vite)
```

### Testing

```bash
# API unit + integration tests
cd api && npm test

# API test coverage
cd api && npm run test:coverage

# Web component tests
cd web && npm test
```

### Code Quality

```bash
cd api && npm run lint
cd web && npm run lint
```

---

## 13. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` / `production` |
| `PORT` | Yes | API listen port (default 4000) |
| `DATABASE_URL` | Yes | Prisma connection string |
| `JWT_ACCESS_SECRET` | Yes | 64-byte hex secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | 64-byte hex secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Yes | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | e.g. `7d` |
| `CORS_ORIGIN` | Yes | Allowed CORS origin |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | 64-char hex (32-byte) AES-256 key for encrypting stored Gmail App Passwords |
| `COOKIE_DOMAIN` | Yes | Cookie domain (e.g. `.timekeeping.local`) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window ms (default 60000) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default 100) |
| `AUTH_RATE_LIMIT_MAX` | No | Max auth requests per window (default 5) |
| `TZ` | No | Timezone for cron jobs (default `America/New_York`) |
