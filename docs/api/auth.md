# Authentication API

Authentication endpoints for user login, token management, and session handling.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/anonymous` | None | Create anonymous session |
| POST | `/api/auth/login` | None | User login |
| POST | `/api/auth/refresh` | None | Refresh tokens |
| POST | `/api/auth/logout` | None | Invalidate refresh token |
| POST | `/api/auth/change-password` | JWT | Change password |
| GET | `/api/auth/me` | JWT | Get current user |

---

## POST /api/auth/anonymous

Create an anonymous user session for demo access.

### Request

No body required.

### Response `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "password_change_required": false
}
```

### Notes

- Creates anonymous user with email `anon-{uuid}@anon.eversaid.example`
- Assigned to reserved tenant `00000000-0000-0000-0000-000000000000`
- Tokens also set as httpOnly cookies

---

## POST /api/auth/login

Authenticate a user and obtain tokens.

### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | Yes | User's email address |
| password | string | Yes | User's password |

### Response `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "password_change_required": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| access_token | string | JWT access token (15 min expiry) |
| refresh_token | string | JWT refresh token (30 day expiry) |
| token_type | string | Always "bearer" |
| expires_in | integer | Access token expiry in seconds |
| password_change_required | boolean | True if user must change password |

### Errors

| Code | Description |
|------|-------------|
| 401 | Invalid email or password |
| 403 | User account inactive |
| 403 | Tenant inactive |
| 429 | Rate limit exceeded |

---

## POST /api/auth/refresh

Exchange a refresh token for new access and refresh tokens.

### Request

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh_token | string | Yes | Current refresh token |

### Response `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "password_change_required": false
}
```

### Notes

- Implements token rotation: old refresh token is invalidated
- New refresh token issued with each refresh

### Errors

| Code | Description |
|------|-------------|
| 401 | Invalid or expired refresh token |
| 429 | Rate limit exceeded |

---

## POST /api/auth/logout

Invalidate a refresh token session.

### Request

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh_token | string | Yes | Refresh token to invalidate |

### Response `204 No Content`

No body returned.

### Notes

- Returns 204 regardless of token validity (idempotent)
- Access tokens remain valid until expiry (15 min max)

---

## POST /api/auth/change-password

Change the authenticated user's password.

### Authentication

Requires JWT Bearer token.

### Request

```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| current_password | string | Yes | Min 1 character |
| new_password | string | Yes | Min 8 characters |

### Response `204 No Content`

No body returned.

### Notes

- Clears `password_change_required` flag on success
- Does not invalidate existing tokens

### Errors

| Code | Description |
|------|-------------|
| 400 | Current password incorrect |
| 401 | Token missing or expired |

---

## GET /api/auth/me

Get the current authenticated user's information.

### Authentication

Requires JWT Bearer token.

### Response `200 OK`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "is_active": true,
    "role": "tenant_user",
    "password_change_required": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "tenant": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```