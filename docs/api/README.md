# Eversaid API Documentation

API documentation for the Eversaid wrapper backend (FastAPI).

## Architecture

```
Frontend (Next.js) → Wrapper Backend (FastAPI) → Core API
```

The wrapper backend handles:
- Multi-tenant JWT authentication (anonymous + registered users)
- Rate limiting (per-user, per-IP, global)
- Proxying requests to the private Core API
- Local data storage (feedback, waitlist, API keys)

## API Routes

| Documentation | Base Path | Description |
|---------------|-----------|-------------|
| [Authentication](./auth.md) | `/api/auth/*` | Login, logout, token refresh, password management |
| [Admin](./admin.md) | `/api/admin/*` | Tenant and user management (admin only) |
| [Core Proxy](./core.md) | `/api/*` | Transcription, cleanup, analysis (proxied to Core API) |
| [Local](./local.md) | `/api/*` | Feedback, waitlist, config (stored locally) |
| [API Keys](./api-keys.md) | `/api/keys/*` | API key management for programmatic access |

## Authentication

### JWT Tokens

Most endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens are also set as httpOnly cookies for browser clients.

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Access Token | 15 minutes | Request authentication + authorization context |
| Refresh Token | 30 days | Obtain new access tokens |

### User Roles

| Role | Description |
|------|-------------|
| `platform_admin` | Manages all tenants and users system-wide |
| `tenant_admin` | Manages users within their tenant only |
| `tenant_user` | Regular user with no admin capabilities |

### Anonymous Users

Demo users are automatically created with:
- Email format: `anon-{uuid}@anon.eversaid.example`
- Reserved tenant ID: `00000000-0000-0000-0000-000000000000`

## Rate Limiting (Anonymous Users)

### Transcription Limits (default)

| Scope | Limit | Window |
|-------|-------|--------|
| Per-user | 20 | 24 hours |
| Per-IP | 100 | 24 hours |
| Global | 1000 | 24 hours |

### Analysis Limits (10x higher)

| Scope | Limit | Window |
|-------|-------|--------|
| Per-user | 200 | 24 hours |
| Per-IP | 1000 | 24 hours |
| Global | 10000 | 24 hours |

### Auth Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per-IP (login/refresh) | 10 | 15 minutes |

### Rate Limit Headers

All responses include:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1234567890
```

### Rate Limit Exceeded (429)

```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily limit reached",
  "limit_type": "day",
  "retry_after": 3600,
  "limits": {
    "day": {"limit": 20, "remaining": 0, "reset": 1234567890}
  }
}
```

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message here"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 400 | Bad request (validation error, business logic error) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 422 | Validation error (invalid input format) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## CAPTCHA (Turnstile)

Some endpoints require Cloudflare Turnstile verification:
- `POST /api/transcribe`
- `POST /api/import-text`
- `POST /api/transcriptions/{id}/cleanup`

Include the Turnstile token in the request header:

```
CF-Turnstile-Response: <turnstile_token>
```
