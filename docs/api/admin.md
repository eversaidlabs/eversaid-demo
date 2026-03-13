# Admin API

Administrative endpoints for tenant and user management. Requires admin privileges.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/tenants` | Platform Admin | Create tenant |
| GET | `/api/admin/tenants` | Platform Admin | List tenants |
| POST | `/api/admin/users` | Tenant Admin+ | Create user |
| GET | `/api/admin/users` | Tenant Admin+ | List users |
| GET | `/api/admin/platform/users` | Platform Admin | List all users with usage data |

---

## POST /api/admin/tenants

Create a new tenant organization.

### Authentication

Requires `platform_admin` role.

### Request

```json
{
  "name": "Acme Corporation"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | 1-255 characters |

### Response `201 Created`

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corporation",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 403 | User is not platform_admin |

---

## GET /api/admin/tenants

List all tenants in the system.
TODO: Pagination.

### Authentication

Requires `platform_admin` role.

### Response `200 OK`

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Globex Inc",
    "is_active": true,
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-10T08:00:00Z"
  }
]
```

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 403 | User is not platform_admin |

---

## POST /api/admin/users

Create a new user.

### Authentication

Requires `tenant_admin` or `platform_admin` role.

### Request

```json
{
  "email": "newuser@example.com",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "role": "tenant_user",
  "password": "optional-password"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | Yes | User's email address |
| tenant_id | string (UUID) | Conditional | Required for platform_admin, auto-filled for tenant_admin |
| role | string | No | Default: `tenant_user`. One of: `platform_admin`, `tenant_admin`, `tenant_user` |
| password | string | No | If omitted, a temporary password is generated |

### Access Rules

| Caller Role | Can Create Roles | Tenant Scope |
|-------------|------------------|--------------|
| platform_admin | Any role | Any tenant |
| tenant_admin | tenant_user only | Own tenant only |

### Response `201 Created`

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com",
    "is_active": true,
    "role": "tenant_user",
    "password_change_required": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "temporary_password": "Xk9mP2vL8nQr"
}
```

| Field | Type | Description |
|-------|------|-------------|
| user | object | Created user object |
| temporary_password | string | Generated password (only if not provided in request) |

### Errors

| Code | Description |
|------|-------------|
| 400 | Platform admin missing tenant_id |
| 401 | Token missing or expired |
| 403 | Tenant admin creating non-tenant_user role |
| 403 | Tenant admin accessing other tenant |
| 409 | Email already exists |

---

## GET /api/admin/users

List users with optional filters.
TODO: Pagination.

### Authentication

Requires `tenant_admin` or `platform_admin` role.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| tenant_id | string (UUID) | Filter by tenant (platform_admin only) |
| role | string | Filter by role |

### Access Rules

| Caller Role | Can View |
|-------------|----------|
| platform_admin | All users (can filter by tenant) |
| tenant_admin | Users in own tenant only |

### Response `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "user1@example.com",
    "is_active": true,
    "role": "tenant_user",
    "password_change_required": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "551e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "is_active": true,
    "role": "tenant_admin",
    "password_change_required": false,
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-12T14:00:00Z"
  }
]
```

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 403 | Tenant admin accessing other tenant's users |

---

## GET /api/admin/platform/users

List all users across all tenants with usage data and quota status. This endpoint batch-fetches usage data from Core API in a single request to avoid N+1 queries.

### Authentication

Requires `platform_admin` role.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| email | string | Filter by email (partial match) |
| registered_after | date | Filter users registered after this date |
| registered_before | date | Filter users registered before this date |
| quota_status | string | Filter by quota status: `ok`, `warning`, `critical` |
| limit | integer | Max users to return (1-100, default: 50) |
| offset | integer | Number of users to skip (default: 0) |

### Response `200 OK`

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user1@example.com",
      "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
      "tenant_name": "Acme Corporation",
      "role": "tenant_user",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "password_change_required": false,
      "transcription_seconds_limit": 3600,
      "text_cleanup_words_limit": 50000,
      "analysis_count_limit": 100,
      "transcription_seconds_used": 1800,
      "text_cleanup_words_used": 25000,
      "analysis_count_used": 50,
      "overall_quota_status": "ok"
    }
  ],
  "total": 150
}
```

| Field | Type | Description |
|-------|------|-------------|
| users | array | List of users with tenant and usage data |
| total | integer | Total count of users matching filters |
| transcription_seconds_used | integer | Audio transcription seconds used |
| text_cleanup_words_used | integer | Text cleanup words used |
| analysis_count_used | integer | Analysis count used |
| overall_quota_status | string | Worst status across all quotas: `ok`, `warning`, `critical` |

### Quota Status Values

| Status | Description |
|--------|-------------|
| ok | More than 20% remaining |
| warning | 5-20% remaining |
| critical | Less than 5% remaining |

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 403 | User is not platform_admin |
