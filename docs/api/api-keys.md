# API Keys

Endpoints for managing API keys for programmatic access to the Core API.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/keys` | JWT | Create API key |
| GET | `/api/keys` | JWT | List API keys |
| GET | `/api/keys/{id}` | JWT | Get API key details |
| DELETE | `/api/keys/{id}` | JWT | Revoke API key |

### Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/internal/validate-key` | Secret | Validate API key (Core API only) |

---

## POST /api/keys

Create a new API key for programmatic access.

### Authentication

Requires JWT Bearer token.

### Request

```json
{
  "name": "Production Integration",
  "description": "Used by our main application",
  "scopes": ["transcribe", "analyze"],
  "rate_limit_rpm": 100,
  "expires_at": "2025-12-31T23:59:59Z"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | 1-100 chars | Key identifier |
| description | string | No | Max 500 chars | Key description |
| scopes | array | No | - | Permission scopes (empty = full access) |
| rate_limit_rpm | integer | No | 1-10000 | Requests per minute limit |
| expires_at | datetime | No | Future, timezone-aware | Expiration date |

### Response `201 Created`

```json
{
  "api_key": "esk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "name": "Production Integration",
  "description": "Used by our main application",
  "key_prefix": "esk_a1b2c3d",
  "scopes": ["transcribe", "analyze"],
  "rate_limit_rpm": 100,
  "expires_at": "2025-12-31T23:59:59Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| api_key | string | **Full key - shown only once!** |
| id | string (UUID) | Key identifier for management |
| name | string | Key name |
| description | string | Key description |
| key_prefix | string | First 11 characters for identification |
| scopes | array | Permission scopes |
| rate_limit_rpm | integer | Requests per minute limit |
| expires_at | datetime | Expiration timestamp |
| created_at | datetime | Creation timestamp |

### Important

**The full `api_key` value is only returned on creation.** Store it securely - it cannot be retrieved later.

### Limits

Maximum 10 active keys per user.

### Errors

| Code | Description |
|------|-------------|
| 400 | Expiration date not in future |
| 400 | Maximum keys (10) reached |
| 401 | Token missing or expired |

---

## GET /api/keys

List all active API keys for the current user.

### Authentication

Requires JWT Bearer token.

### Response `200 OK`

```json
{
  "keys": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Production Integration",
      "description": "Used by our main application",
      "key_prefix": "esk_a1b2c3d",
      "scopes": ["transcribe", "analyze"],
      "rate_limit_rpm": 100,
      "expires_at": "2025-12-31T23:59:59Z",
      "is_active": true,
      "last_used_at": "2024-01-15T14:30:00Z",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| keys | array | List of API key objects |
| count | integer | Total number of keys |

### Notes

- Full key values are never returned after creation
- Only shows active (non-revoked) keys

---

## GET /api/keys/{key_id}

Get details for a specific API key.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| key_id | string (UUID) | API key identifier |

### Response `200 OK`

```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "name": "Production Integration",
  "description": "Used by our main application",
  "key_prefix": "esk_a1b2c3d",
  "scopes": ["transcribe", "analyze"],
  "rate_limit_rpm": 100,
  "expires_at": "2025-12-31T23:59:59Z",
  "is_active": true,
  "last_used_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 404 | Key not found or not owned by user |

---

## DELETE /api/keys/{key_id}

Revoke an API key. The key will immediately stop working.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| key_id | string (UUID) | API key identifier |

### Response `204 No Content`

No body returned.

### Notes

- Soft delete: key is marked inactive, not physically deleted
- Takes effect immediately
- Cannot be undone

### Errors

| Code | Description |
|------|-------------|
| 400 | Key already revoked |
| 401 | Token missing or expired |
| 404 | Key not found or not owned by user |

---

## POST /api/internal/validate-key

**Internal endpoint** - Validate an API key. Called by Core API to authenticate programmatic requests.

### Authentication

Requires `X-Internal-Secret` header with shared secret.

### Request

```json
{
  "api_key": "esk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| api_key | string | Yes | Exactly 44 chars | Full API key |

### Response `200 OK`

**Valid key:**

```json
{
  "valid": true,
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "tenant_user",
  "scopes": ["transcribe", "analyze"],
  "rate_limit_rpm": 100,
  "error": null
}
```

**Invalid key:**

```json
{
  "valid": false,
  "tenant_id": null,
  "user_id": null,
  "role": null,
  "scopes": [],
  "rate_limit_rpm": null,
  "error": "API key expired"
}
```

| Field | Type | Description |
|-------|------|-------------|
| valid | boolean | Whether key is valid |
| tenant_id | string | Key owner's tenant ID |
| user_id | string | Key owner's user ID |
| role | string | User role (platform_admin, tenant_admin, tenant_user) |
| scopes | array | Granted permission scopes |
| rate_limit_rpm | integer | Per-minute rate limit |
| error | string | Error message if invalid |

### Validation Flow

1. Extract prefix from API key
2. Find candidate keys by prefix
3. Verify bcrypt hash against candidates
4. Check active status
5. Check expiration
6. Update `last_used_at` timestamp
7. Return user context and rate limit

### Errors

| Code | Description |
|------|-------------|
| 401 | Missing or invalid X-Internal-Secret header |
| 500 | INTERNAL_API_SECRET not configured |

---

## Using API Keys

### Making Requests

Include the API key in the `Authorization` header:

```
Authorization: Bearer esk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Key Format

API keys follow the format: `esk_` + 40 random characters (44 total).

The prefix (`esk_a1b2c3d`) is stored in plain text for identification. The full key is hashed with bcrypt.

### Security Best Practices

1. **Never commit keys to version control**
2. **Use environment variables** to store keys
3. **Set expiration dates** for keys used in less secure environments
4. **Use minimal scopes** - only request permissions you need
5. **Rotate keys regularly** - create new keys and revoke old ones
6. **Monitor `last_used_at`** - revoke unused keys
