# Local API (Feedback, Waitlist, Config)

Endpoints that store data locally in the wrapper's PostgreSQL database (not proxied to Core API).

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config` | None | Get frontend configuration |
| GET | `/api/rate-limits` | JWT | Get rate limit status |
| POST | `/api/entries/{id}/feedback` | JWT | Submit feedback |
| GET | `/api/entries/{id}/feedback` | JWT | Get feedback |
| POST | `/api/waitlist` | None | Join waitlist |

---

## GET /api/config

Get runtime configuration for the frontend.

### Authentication

None (public endpoint).

### Response `200 OK`

```json
{
  "posthog": {
    "key": "phc_xxxxxxxxxxxx",
    "host": "https://app.posthog.com"
  },
  "limits": {
    "maxAudioFileSizeMb": 25,
    "maxAudioDurationSeconds": 3600
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| posthog.key | string | PostHog project API key |
| posthog.host | string | PostHog host URL |
| limits.maxAudioFileSizeMb | integer | Maximum audio file size in MB |
| limits.maxAudioDurationSeconds | integer | Maximum audio duration in seconds |

---

## GET /api/rate-limits

Check current rate limit status without consuming a request.

### Authentication

Requires JWT Bearer token.

### Response `200 OK`

Response body is empty. Rate limit information is in headers:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1234567890
X-RateLimit-Type: day
```

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests allowed |
| X-RateLimit-Remaining | Requests remaining |
| X-RateLimit-Reset | Unix timestamp when limit resets |
| X-RateLimit-Type | Limit window type |

### Notes

Call this endpoint on page load to display rate limit status to users.

---

## POST /api/entries/{entry_id}/feedback

Submit feedback for an entry's transcription, cleanup, or analysis.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| entry_id | string (UUID) | Entry identifier |

### Request

```json
{
  "feedback_type": "transcription",
  "rating": 4,
  "feedback_text": "Good accuracy but missed a few words."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| feedback_type | string | Yes | One of: `transcription`, `cleanup`, `analysis` | What aspect to rate |
| rating | integer | Yes | 1-5 | Star rating |
| feedback_text | string | No | Max 1000 chars | Optional comment |

### Response `200 OK` / `201 Created`

```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "entry_id": "550e8400-e29b-41d4-a716-446655440000",
  "feedback_type": "transcription",
  "rating": 4,
  "feedback_text": "Good accuracy but missed a few words.",
  "created_at": "2024-01-15T10:45:00Z"
}
```

### Notes

- Uses upsert: updates existing feedback for same (user, entry, type) combination
- Returns `200 OK` on update, `201 Created` on new
- Verifies entry exists in Core API before saving

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 404 | Entry not found in Core API |

---

## GET /api/entries/{entry_id}/feedback

Get all feedback for an entry from the current user.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| entry_id | string (UUID) | Entry identifier |

### Response `200 OK`

```json
[
  {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "entry_id": "550e8400-e29b-41d4-a716-446655440000",
    "feedback_type": "transcription",
    "rating": 4,
    "feedback_text": "Good accuracy but missed a few words.",
    "created_at": "2024-01-15T10:45:00Z"
  },
  {
    "id": "991e8400-e29b-41d4-a716-446655440000",
    "entry_id": "550e8400-e29b-41d4-a716-446655440000",
    "feedback_type": "cleanup",
    "rating": 5,
    "feedback_text": null,
    "created_at": "2024-01-15T10:46:00Z"
  }
]
```

### Notes

- Returns only feedback submitted by the authenticated user
- Verifies entry exists in Core API

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 404 | Entry not found in Core API |

---

## POST /api/waitlist

Join the waitlist for API access or extended usage.

### Authentication

None (public endpoint).

### Request

```json
{
  "email": "interested@example.com",
  "use_case": "I want to transcribe customer service calls",
  "waitlist_type": "api_access",
  "source_page": "/pricing",
  "language_preference": "en"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| email | string (email) | Yes | Valid email | Contact email |
| use_case | string | No | Max 500 chars | How they plan to use the service |
| waitlist_type | string | Yes | One of: `api_access`, `extended_usage` | What they're signing up for |
| source_page | string | No | - | Page where signup occurred |
| language_preference | string | No | Max 40 chars | Preferred language |

### Response `200 OK`

```json
{
  "message": "Thank you for joining the waitlist!"
}
```

### Notes

- Idempotent: duplicate emails are handled silently
- Always returns success to avoid email enumeration
