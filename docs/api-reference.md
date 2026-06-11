# API Reference

Base URL: `https://api.timekeeping.local/v1`

All endpoints (except `/health` and `POST /auth/login`) require:
```
Authorization: Bearer <access_token>
```

Response envelope:
```json
{ "data": {}, "meta": {} }
```
Error envelope:
```json
{ "status": "error", "message": "...", "errors": [] }
```

---

## Health

### `GET /health`
No auth required.

**Response 200**
```json
{ "status": "ok", "timestamp": "2026-01-01T09:00:00.000Z" }
```

---

## Authentication

Rate limited: **10 requests/minute** per IP.

### `POST /auth/login`
**Body**
```json
{ "email": "admin@timekeeping.local", "password": "Admin@123!" }
```
**Response 200**
```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "ADMIN" }
  }
}
```
Sets `refreshToken` httpOnly cookie (7 days).

**Errors:** `401 Invalid credentials`

---

### `POST /auth/refresh`
Uses the `refreshToken` cookie. Returns a new access token and rotates the refresh token cookie.

**Response 200**
```json
{
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "...", "email": "...", "role": "ADMIN" }
  }
}
```
**Errors:** `401 Invalid or expired refresh token`

---

### `POST /auth/logout`
Clears the refresh token. Requires `Authorization` header.

**Response 204** (no body)

---

### `GET /auth/me`
Returns the current authenticated user.

**Response 200**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "STANDARD",
    "isActive": true,
    "invoicePrefix": "ACME",
    "gmailUser": "jane@gmail.com",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```
> `gmailUser` is `null` when not configured. The App Password is never returned.

---

## Users

> Admin-only for `GET /`, `POST /`, and `PATCH /:id/disable`.

### `GET /users`
Query params: `page`, `limit`, `search`, `role`, `isActive`

**Response 200**
```json
{
  "data": [{ "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "STANDARD", "isActive": true }],
  "meta": { "page": 1, "limit": 25, "total": 5 }
}
```

---

### `POST /users`
**Body**
```json
{
  "email": "new@example.com",
  "password": "Str0ng#Pass!",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "STANDARD"
}
```
Password rules: min 12 chars, 1 uppercase, 1 number, 1 special character.

**Response 201** — returns created user object.

**Errors:** `409 Email already in use`

---

### `GET /users/:id`
**Response 200** — user object.

---

### `PATCH /users/:id`
**Body** (all optional)
```json
{ "firstName": "Jane", "lastName": "Smith", "email": "new@example.com", "role": "ADMIN", "invoicePrefix": "ACME", "gmailUser": "jane@gmail.com", "gmailAppPassword": "abcdabcdabcdabcd" }
```
- `gmailAppPassword` is write-only — it is stored encrypted (AES-256-GCM) and never returned in responses.
- Send `gmailAppPassword: ""` to clear the stored credential.

**Response 200** — updated user object (includes `gmailUser`, never `gmailAppPasswordEnc`).

---

### `PATCH /users/me/password`
Any authenticated user can change their own password.

**Body**
```json
{ "currentPassword": "old", "newPassword": "NewStr0ng#Pass!" }
```
**Response 204** — invalidates refresh token (forces re-login).

---

### `PATCH /users/:id/disable`
Admin only. Sets `isActive = false`.

**Response 200** — updated user.

**Errors:** `400 Cannot disable your own account`

---

## Clients

> `POST`, `PATCH`, `DELETE` require Admin role. `GET` requires any authenticated user.

### `GET /clients`
Query: `page`, `limit`, `search`, `isActive`

**Response 200** — paginated client list.

---

### `POST /clients`
**Body**
```json
{
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "phone": "+1-555-0100",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "country": "US",
  "notes": "Net 30"
}
```
**Response 201**

---

### `GET /clients/:id`
**Response 200** — client object.

---

### `PATCH /clients/:id`
**Body** — same fields as POST, all optional.

**Response 200**

---

### `DELETE /clients/:id`
Soft delete (sets `isActive = false`).

**Errors:** `400 Client has active projects — disable them first`

---

## Projects

> Same RBAC as Clients.

### `GET /projects`
Query: `page`, `limit`, `search`, `clientId`, `isActive`

**Response 200**
```json
{
  "data": [{
    "id": "...", "name": "Website Redesign", "clientId": "...",
    "costPerHour": "150.00", "isActive": true,
    "client": { "id": "...", "name": "Acme Corp" }
  }],
  "meta": { "page": 1, "limit": 25, "total": 3 }
}
```

---

### `POST /projects`
**Body**
```json
{ "clientId": "uuid", "name": "Mobile App", "costPerHour": 175.00, "description": "iOS + Android" }
```
`costPerHour` must be positive and a multiple of 0.01.

**Response 201**

---

### `GET /projects/:id` / `PATCH /projects/:id` / `DELETE /projects/:id`
Same pattern as Clients.

---

## Time Entries

### `GET /time-entries`
Query: `page`, `limit`, `startDate` (YYYY-MM-DD), `endDate`, `projectId`, `clientId`, `userId` (admin only), `isBilled`

**Response 200**
```json
{
  "data": [{
    "id": "...", "date": "2026-01-15T00:00:00.000Z", "hours": "8.00",
    "description": "API development", "isBilled": false,
    "project": { "id": "...", "name": "Mobile App", "costPerHour": "175.00",
      "client": { "id": "...", "name": "Acme Corp" }
    }
  }],
  "meta": { "page": 1, "limit": 25, "total": 42 }
}
```

---

### `GET /time-entries/weekly`
Query: `weekStart` (YYYY-MM-DD, must be Monday), `userId` (admin only)

**Response 200**
```json
{
  "data": {
    "weekStart": "2026-01-13",
    "days": {
      "2026-01-13": [{ "id": "...", "hours": "2.00", ... }],
      "2026-01-14": []
    },
    "totalHours": 32.5,
    "totalCost": 5687.50
  }
}
```

---

### `POST /time-entries`
**Body**
```json
{ "projectId": "uuid", "date": "2026-01-15", "hours": 3.5, "description": "Sprint planning" }
```
`hours` must be a positive multiple of 0.25, max 24.

**Response 201**

---

### `PATCH /time-entries/:id`
**Body** — same fields, all optional.

**Errors:** `403 Cannot modify a billed entry`

---

### `DELETE /time-entries/:id`
**Response 204**

**Errors:** `403 Cannot delete a billed entry`

---

## Reports

### `GET /reports/monthly`
Query: `year` (req), `month` (1–12, req), `clientId`, `userId` (admin only)

**Response 200**
```json
{
  "data": {
    "year": 2026, "month": 1,
    "rows": [{ "clientName": "Acme", "projectName": "Mobile App", "hours": 32.5, "cost": 5687.50 }],
    "totalHours": 32.5, "totalCost": 5687.50
  }
}
```

---

### `GET /reports/quarterly`
Query: `year` (req), `quarter` (1–4, req), `clientId`, `userId` (admin only)

**Response 200** — `{ year, quarter, months: [monthly...], totalHours, totalCost }`

---

### `GET /reports/yearly`
Query: `year` (req), `clientId`, `userId` (admin only)

**Response 200** — `{ year, quarters: [quarterly...], totalHours, totalCost }`

---

## Alerts

### `GET /alerts`
Query: `page`, `limit`, `type` (DAILY|WEEKLY), `isActive`

**Response 200**
```json
{
  "data": [{
    "id": "...", "type": "DAILY", "isActive": true,
    "project": { "id": "...", "name": "Mobile App", "client": { "name": "Acme" } }
  }]
}
```

---

### `POST /alerts`
**Body**
```json
{ "projectId": "uuid", "type": "DAILY", "isActive": true }
```
**Errors:** `409 Alert already exists for this project/type combination`

---

### `PATCH /alerts/:id`
**Body**
```json
{ "isActive": false }
```

---

### `DELETE /alerts/:id`
**Response 204**

---

## Invoices

### `GET /invoices`
Query: `page`, `limit`, `clientId`, `status` (DRAFT|OPEN|SENT|RESENT|PAID|PAID_CLOSED)

**Response 200**
```json
{
  "data": [{
    "id": "...", "invoiceNumber": "ACME-2026-0001", "status": "OPEN",
    "subtotal": "5600.00", "taxRate": "0", "taxAmount": "0", "total": "5600.00",
    "periodStart": "2026-01-01T00:00:00.000Z", "periodEnd": "2026-01-31T00:00:00.000Z",
    "dueDate": "2026-02-15T00:00:00.000Z",
    "client": { "id": "...", "name": "Acme Corp" },
    "createdAt": "2026-02-01T09:00:00.000Z"
  }],
  "meta": { "page": 1, "limit": 25, "total": 7 }
}
```

---

### `POST /invoices`
**Body**
```json
{
  "clientId": "uuid",
  "timeEntryIds": ["uuid1", "uuid2"],
  "prefix": "ACME",
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "dueDate": "2026-02-15",
  "taxRate": 8.5,
  "notes": "Net 30. Thank you for your business."
}
```
- `prefix` must match `/^[A-Z0-9-]+$/`
- All `timeEntryIds` must be unbilled and belong to `clientId`
- Invoice number generated as `{PREFIX}-{YYYY}-{NNNN}` (per-prefix sequence)
- Time entries marked `isBilled = true` atomically

**Response 201** — full invoice with items.

**Errors:** `400 No time entries provided`, `409 Entry already billed`, `404 Entry not found`

---

### `GET /invoices/:id`
Includes `items` array with embedded `timeEntry` and `project`.

---

### `PATCH /invoices/:id`
Update mutable fields (notes, dueDate) on DRAFT/OPEN invoices.

**Body**
```json
{ "notes": "Updated terms", "dueDate": "2026-03-01" }
```

---

### `PATCH /invoices/:id/status`
**Body**
```json
{ "status": "OPEN" }
```

Valid transitions:
| From | To (allowed) |
|------|-------------|
| DRAFT | OPEN |
| OPEN | DRAFT, SENT |
| SENT | RESENT, PAID |
| RESENT | PAID |
| PAID | PAID_CLOSED |
| PAID_CLOSED | _(none)_ |

**Errors:** `400 Invalid status transition`

---

### `POST /invoices/:id/send`
Generates PDF and sends via the **invoice owner's** Gmail credentials (configured in their Profile). Updates status to SENT (or RESENT if already sent).

**Response 200**
```json
{ "data": { "sent": true, "status": "SENT" } }
```
**Errors:** `400 Gmail credentials are not configured on your profile`, `500 Email delivery failed`

---

### `GET /invoices/:id/pdf`
Query: `download=true` sets `Content-Disposition: attachment`.

**Response 200** — `application/pdf` binary stream.

---

### `DELETE /invoices/:id`
Only DRAFT invoices can be deleted. Unmarks all time entries as billed.

**Response 204**

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Validation error — see `errors` array |
| 401 | Missing or invalid access token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate, invalid state transition) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
