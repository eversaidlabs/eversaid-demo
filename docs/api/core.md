# Core API (Transcription, Cleanup, Analysis)

Endpoints that proxy to the Core API for transcription, cleanup, and analysis functionality.

## Endpoints

### Options
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/options` | None | Get available options |

### Transcription
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/transcribe` | JWT | Start transcription |
| GET | `/api/transcriptions/{id}` | JWT | Get transcription status |

### Entries
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/entries` | JWT | List entries |
| GET | `/api/entries/{id}` | JWT | Get entry with details |
| DELETE | `/api/entries/{id}` | JWT | Delete entry |
| GET | `/api/entries/{id}/audio` | JWT | Stream audio file |
| GET | `/api/entries/{id}/cleaned` | JWT | List cleanup versions |

### Cleanup
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/import-text` | JWT | Import text for cleanup |
| POST | `/api/transcriptions/{id}/cleanup` | JWT | Trigger cleanup |
| GET | `/api/cleaned-entries/{id}` | JWT | Get cleaned entry |
| PUT | `/api/cleaned-entries/{id}/user-edit` | JWT | Save user edits |
| DELETE | `/api/cleaned-entries/{id}/user-edit` | JWT | Revert to AI cleanup |

### Analysis
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analysis-profiles` | JWT | List analysis profiles |
| POST | `/api/cleaned-entries/{id}/analyze` | JWT | Trigger analysis |
| GET | `/api/cleaned-entries/{id}/analyses` | JWT | List analyses |
| GET | `/api/analyses/{id}` | JWT | Get analysis result |

---

## GET /api/options

Get available transcription and LLM options.

### Authentication

None (public endpoint).

### Response `200 OK`

Returns available models, providers, and configuration options from Core API.

---

## POST /api/transcribe

Start a new transcription job.

### Authentication

Requires JWT Bearer token.

### CAPTCHA

Requires Turnstile token in `CF-Turnstile-Response` header.

### Request (multipart/form-data)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| file | file | Yes | - | Audio file |
| language | string | No | "sl" | Transcription language |
| enable_diarization | boolean | No | true | Enable speaker detection |
| speaker_count | integer | No | 2 | Expected number of speakers |
| enable_analysis | boolean | No | true | Run analysis after cleanup |
| analysis_profile | string | No | "generic-summary" | Analysis profile ID |
| cleanup_type | string | No | "clean" | One of: minimal, clean, edited |
| llm_model | string | No | - | LLM model for cleanup |
| cleanup_temperature | float | No | 0.0 | Temperature (0-2) |
| analysis_llm_model | string | No | - | LLM model for analysis |

### Response `202 Accepted`

```json
{
  "entry_id": "550e8400-e29b-41d4-a716-446655440000",
  "transcription_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 422 | Audio file validation failed (size/duration) |
| 429 | Rate limit exceeded |

---

## POST /api/import-text

Import existing text for cleanup and analysis (skip transcription).

### Authentication

Requires JWT Bearer token.

### CAPTCHA

Requires Turnstile token in `CF-Turnstile-Response` header.

### Request

```json
{
  "text": "Text content to clean up...",
  "language": "en",
  "cleanup_type": "clean",
  "llm_model": "gpt-4",
  "analysis_profile": "generic-summary"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| text | string | Yes | - | Text to import (1-500,000 characters) |
| language | string | No | "en" | Text language |
| cleanup_type | string | No | "clean" | One of: minimal, clean, edited |
| llm_model | string | No | - | LLM model for cleanup |
| analysis_profile | string | No | - | Analysis profile ID |

### Response `202 Accepted`

Returns entry and transcription IDs from Core API.

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 422 | Validation failed (empty text or exceeds 500KB limit) |
| 429 | Rate limit exceeded |

---

## GET /api/transcriptions/{transcription_id}

Get transcription status and segments.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| transcription_id | string (UUID) | Transcription identifier |

### Response `200 OK`

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "text": "Full transcription text...",
  "segments": [
    {
      "start": 0.0,
      "end": 5.5,
      "text": "Hello, welcome to the meeting.",
      "speaker": 0
    }
  ]
}
```

| Status Values | Description |
|---------------|-------------|
| pending | Job queued |
| processing | Transcription in progress |
| completed | Successfully completed |
| failed | Transcription failed |

---

## GET /api/entries

List user's entries with pagination.

### Authentication

Requires JWT Bearer token.

### Query Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| limit | integer | 20 | 1-100 | Results per page |
| offset | integer | 0 | 0+ | Skip N results |
| entry_type | string | - | - | Filter by type |

### Response `200 OK`

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "meeting.mp3",
      "entry_type": "audio",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## GET /api/entries/{entry_id}

Get entry with full details including transcription, cleanup, and analyses.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| entry_id | string (UUID) | Entry identifier |

### Response `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "meeting.mp3",
  "entry_type": "audio",
  "status": "completed",
  "created_at": "2024-01-15T10:30:00Z",
  "transcription": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "text": "Full transcription...",
    "segments": [...]
  },
  "cleanup": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "text": "Cleaned text...",
    "segments": [...]
  },
  "analyses": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "profile_id": "generic-summary",
      "status": "completed",
      "result": {...}
    }
  ]
}
```

### Notes

This endpoint composes data from multiple Core API calls due to API limitations.

---

## DELETE /api/entries/{entry_id}

Delete an entry and all associated data.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| entry_id | string (UUID) | Entry identifier |

### Response `200 OK`

Returns deletion confirmation from Core API.

---

## GET /api/entries/{entry_id}/audio

Stream the audio file for an entry.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| entry_id | string (UUID) | Entry identifier |

### Response `200 OK`

Binary audio stream with headers:
- `Content-Type`: Audio MIME type
- `Content-Length`: File size
- `Content-Disposition`: Filename

---

## GET /api/entries/{entry_id}/cleaned

List all cleanup versions for an entry.

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
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "cleanup_type": "clean",
    "llm_model": "gpt-4",
    "status": "completed",
    "created_at": "2024-01-15T10:35:00Z"
  },
  {
    "id": "771e8400-e29b-41d4-a716-446655440000",
    "cleanup_type": "edited",
    "llm_model": "gpt-4",
    "status": "completed",
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

### Notes

Different model + cleanup_type combinations are cached separately.

---

## POST /api/transcriptions/{transcription_id}/cleanup

Trigger cleanup for an existing transcription.

### Authentication

Requires JWT Bearer token.

### CAPTCHA

Requires Turnstile token in `CF-Turnstile-Response` header.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| transcription_id | string (UUID) | Transcription identifier |

### Request

```json
{
  "cleanup_type": "clean",
  "llm_model": "gpt-4",
  "temperature": 0.3
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| cleanup_type | string | No | "clean" | One of: minimal, clean, edited |
| llm_model | string | No | - | LLM model to use |
| temperature | float | No | - | Temperature (0-2) |

### Response `202 Accepted`

Returns cleanup job info from Core API.

---

## GET /api/cleaned-entries/{cleanup_id}

Get cleaned entry details.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| cleanup_id | string (UUID) | Cleanup identifier |

### Response `200 OK`

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "transcription_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "cleanup_type": "clean",
  "text": "Cleaned and formatted text...",
  "segments": [
    {
      "start": 0.0,
      "end": 5.5,
      "text": "Hello, welcome to the meeting.",
      "speaker": 0
    }
  ],
  "user_edited": false
}
```

---

## PUT /api/cleaned-entries/{cleanup_id}/user-edit

Save user edits to cleaned text.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| cleanup_id | string (UUID) | Cleanup identifier |

### Request

```json
{
  "edited_data": {
    "words": [
      {
        "word": "Hello",
        "start": 0.0,
        "end": 0.5,
        "speaker": 0
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| edited_data | object | Yes | TranscriptionData structure with words array |

### Response `200 OK`

Returns updated cleanup from Core API.

---

## DELETE /api/cleaned-entries/{cleanup_id}/user-edit

Revert to AI-generated cleaned text.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| cleanup_id | string (UUID) | Cleanup identifier |

### Response `200 OK`

Returns reverted cleanup from Core API.

---

## GET /api/analysis-profiles

List available analysis profiles.

### Authentication

Requires JWT Bearer token.

### Response `200 OK`

```json
[
  {
    "id": "generic-summary",
    "name": "Generic Summary",
    "description": "General purpose summary and key points extraction"
  },
  {
    "id": "meeting-notes",
    "name": "Meeting Notes",
    "description": "Extract action items, decisions, and participants"
  }
]
```

---

## POST /api/cleaned-entries/{cleanup_id}/analyze

Trigger analysis on a cleaned entry.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| cleanup_id | string (UUID) | Cleanup identifier |

### Request

```json
{
  "profile_id": "generic-summary",
  "llm_model": "gpt-4"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| profile_id | string | No | "generic-summary" | Analysis profile ID |
| llm_model | string | No | - | LLM model to use |

### Response `202 Accepted`

Returns analysis job info from Core API.

### Errors

| Code | Description |
|------|-------------|
| 401 | Token missing or expired |
| 429 | Rate limit exceeded |

---

## GET /api/cleaned-entries/{cleanup_id}/analyses

List all analyses for a cleaned entry.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| cleanup_id | string (UUID) | Cleanup identifier |

### Response `200 OK`

```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "profile_id": "generic-summary",
    "status": "completed",
    "created_at": "2024-01-15T10:40:00Z"
  }
]
```

---

## GET /api/analyses/{analysis_id}

Get analysis status and results.

### Authentication

Requires JWT Bearer token.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| analysis_id | string (UUID) | Analysis identifier |

### Response `200 OK`

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "cleanup_id": "770e8400-e29b-41d4-a716-446655440000",
  "profile_id": "generic-summary",
  "status": "completed",
  "result": {
    "summary": "The meeting covered...",
    "key_points": [
      "Point 1",
      "Point 2"
    ],
    "themes": ["project planning", "timeline"]
  },
  "created_at": "2024-01-15T10:40:00Z"
}
```

| Status Values | Description |
|---------------|-------------|
| pending | Job queued |
| processing | Analysis in progress |
| completed | Successfully completed |
| failed | Analysis failed |
