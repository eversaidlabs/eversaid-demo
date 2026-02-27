"""Tests for Core API proxy endpoints."""

import io

import pytest
import respx
from httpx import Response


class TestTranscribeEndpoint:
    """Tests for POST /api/transcribe endpoint."""

    def test_transcribe_success(self, client, test_settings, auth_headers):
        """Test successful transcription request."""
        # Add mock for upload-transcribe-cleanup endpoint
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "original_filename": "test.mp3",
                    "saved_filename": "saved-test.mp3",
                    "duration_seconds": 120.5,
                    "entry_type": "journal",
                    "uploaded_at": "2025-01-01T00:00:00Z",
                    "transcription_id": "trans-123",
                    "transcription_status": "processing",
                    "transcription_language": "sl",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "pending",
                    "cleanup_model": "llama3",
                    "analysis_id": "analysis-123",
                    "analysis_status": "pending",
                    "analysis_profile": "generic-conversation-summary",
                    "message": "Upload successful, processing started",
                },
            )
        )

        # Create a test audio file
        audio_content = b"fake audio content"
        files = {"file": ("test.mp3", io.BytesIO(audio_content), "audio/mpeg")}
        data = {
            "language": "sl",
            "enable_diarization": "true",
            "speaker_count": "2",
            "enable_analysis": "true",
            "analysis_profile": "generic-conversation-summary",
        }

        response = client.post("/api/transcribe", files=files, data=data, headers=auth_headers)

        assert response.status_code == 202
        data = response.json()
        assert data["entry_id"] == "entry-123"
        assert data["transcription_id"] == "trans-123"
        assert data["transcription_status"] == "processing"

    def test_transcribe_core_api_error(self, client, test_settings, auth_headers):
        """Test transcription when Core API returns error."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/upload-transcribe-cleanup"
        ).mock(
            return_value=Response(
                400,
                json={"detail": "Invalid audio file"},
            )
        )

        files = {"file": ("test.mp3", io.BytesIO(b"fake"), "audio/mpeg")}
        response = client.post("/api/transcribe", files=files, headers=auth_headers)

        assert response.status_code == 400


class TestTranscriptionStatusEndpoint:
    """Tests for GET /api/transcriptions/{id} endpoint."""

    def test_get_transcription_success(self, client, test_settings, auth_headers):
        """Test getting transcription status."""
        respx.get(
            f"{test_settings.CORE_API_URL}/api/v1/transcriptions/trans-123"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "trans-123",
                    "status": "completed",
                    "text": "Hello world",
                    "segments": [
                        {
                            "start": 0.0,
                            "end": 2.5,
                            "text": "Hello world",
                            "speaker": "Speaker 1",
                            "speaker_id": 0,
                        }
                    ],
                    "language": "sl",
                },
            )
        )

        response = client.get("/api/transcriptions/trans-123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "trans-123"
        assert data["status"] == "completed"
        assert data["text"] == "Hello world"

    def test_get_transcription_not_found(self, client, test_settings, auth_headers):
        """Test getting non-existent transcription."""
        respx.get(
            f"{test_settings.CORE_API_URL}/api/v1/transcriptions/invalid-id"
        ).mock(
            return_value=Response(
                404,
                json={"detail": "Transcription not found"},
            )
        )

        response = client.get("/api/transcriptions/invalid-id", headers=auth_headers)

        assert response.status_code == 404


class TestEntryEndpoints:
    """Tests for entry management endpoints."""

    def test_list_entries_success(self, client, test_settings, auth_headers):
        """Test listing entries."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries").mock(
            return_value=Response(
                200,
                json={
                    "entries": [
                        {
                            "id": "entry-123",
                            "original_filename": "test.mp3",
                            "saved_filename": "saved.mp3",
                            "entry_type": "journal",
                            "duration_seconds": 60.0,
                            "uploaded_at": "2025-01-01T00:00:00Z",
                        }
                    ],
                    "total": 1,
                    "limit": 20,
                    "offset": 0,
                },
            )
        )

        response = client.get("/api/entries", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["entries"]) == 1

    def test_list_entries_with_pagination(self, client, test_settings, auth_headers):
        """Test listing entries with pagination parameters."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries").mock(
            return_value=Response(
                200,
                json={
                    "entries": [],
                    "total": 0,
                    "limit": 10,
                    "offset": 5,
                },
            )
        )

        response = client.get("/api/entries?limit=10&offset=5", headers=auth_headers)

        assert response.status_code == 200

    def test_get_entry_success(self, client, test_settings, auth_headers):
        """Test getting a single entry with all related resources."""
        # 1. Main entry endpoint
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={
                    "id": "entry-123",
                    "original_filename": "test.mp3",
                    "saved_filename": "saved.mp3",
                    "duration_seconds": 60.0,
                    "entry_type": "journal",
                    "uploaded_at": "2025-01-01T00:00:00Z",
                    "primary_transcription": {
                        "id": "trans-123",
                        "status": "completed",
                        "text": "Hello world",
                    },
                },
            )
        )

        # 2. Full transcription with segments
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/transcriptions/trans-123").mock(
            return_value=Response(
                200,
                json={
                    "id": "trans-123",
                    "status": "completed",
                    "text": "Hello world",
                    "segments": [{"id": "seg-1", "start": 0, "end": 10, "text": "Hello world"}],
                },
            )
        )

        # 3. Entries list (to find cleanup_id)
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries").mock(
            return_value=Response(
                200,
                json={
                    "entries": [
                        {
                            "id": "entry-123",
                            "latest_cleaned_entry": {"id": "cleanup-123"},
                        }
                    ],
                    "total": 1,
                },
            )
        )

        # 4. Cleanup details
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123").mock(
            return_value=Response(
                200,
                json={
                    "id": "cleanup-123",
                    "cleaned_text": "Hello world, cleaned.",
                },
            )
        )

        # 5. Analyses for this cleanup
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123/analyses").mock(
            return_value=Response(
                200,
                json={"analyses": []},
            )
        )

        response = client.get("/api/entries/entry-123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "entry-123"

    def test_delete_entry_success(self, client, test_settings, auth_headers):
        """Test deleting an entry."""
        respx.delete(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={
                    "message": "Entry deleted successfully",
                    "deleted_id": "entry-123",
                },
            )
        )

        response = client.delete("/api/entries/entry-123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["deleted_id"] == "entry-123"


class TestCleanupEndpoints:
    """Tests for cleanup edit endpoints."""

    def test_get_cleaned_entry_success(self, client, test_settings, auth_headers):
        """Test getting cleaned entry details."""
        respx.get(
            f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "cleanup-123",
                    "voice_entry_id": "entry-123",
                    "transcription_id": "trans-123",
                    "cleaned_text": "Hello world, cleaned.",
                    "status": "completed",
                    "model_name": "llama3",
                    "is_primary": True,
                    "user_edited_text": None,
                    "cleaned_segments": [
                        {
                            "id": 0,
                            "speaker": "Speaker 1",
                            "text": "Hello world, cleaned.",
                            "start": 0.0,
                            "end": 2.5,
                            "cleanup_status": "success",
                        }
                    ],
                },
            )
        )

        response = client.get("/api/cleaned-entries/cleanup-123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "cleanup-123"
        assert data["cleaned_text"] == "Hello world, cleaned."

    def test_update_user_edit_success(self, client, test_settings, auth_headers):
        """Test updating user edit with words-first format."""
        respx.put(
            f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123/user-edit"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "cleanup-123",
                    "cleaned_text": "Original cleaned text",
                    "user_edited_text": "User modified text",
                    "user_edited_at": "2025-01-01T12:00:00Z",
                },
            )
        )

        # API now expects edited_data with words array (words-first format)
        response = client.put(
            "/api/cleaned-entries/cleanup-123/user-edit",
            json={
                "edited_data": {
                    "words": [
                        {"id": 0, "text": "User modified text", "type": "segment_text", "start": 0, "end": 10, "speaker_id": 0}
                    ]
                }
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_edited_text"] == "User modified text"

    def test_revert_user_edit_success(self, client, test_settings, auth_headers):
        """Test reverting user edit."""
        respx.delete(
            f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123/user-edit"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "cleanup-123",
                    "cleaned_text": "Original cleaned text",
                    "user_edited_text": None,
                    "user_edited_at": None,
                },
            )
        )

        response = client.delete("/api/cleaned-entries/cleanup-123/user-edit", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_edited_text"] is None


class TestAnalysisEndpoints:
    """Tests for analysis endpoints."""

    def test_list_analysis_profiles(self, client, test_settings, auth_headers):
        """Test listing analysis profiles."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/analysis-profiles").mock(
            return_value=Response(
                200,
                json={
                    "profiles": [
                        {
                            "id": "generic-conversation-summary",
                            "label": "Conversation Summary",
                            "description": "Extracts main topics and key points",
                            "outputs": ["summary", "topics", "key_points"],
                        },
                        {
                            "id": "action-items",
                            "label": "Action Items & Decisions",
                            "description": "Identifies tasks and decisions",
                            "outputs": ["summary", "action_items", "decisions"],
                        },
                    ],
                    "count": 2,
                },
            )
        )

        response = client.get("/api/analysis-profiles", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["profiles"]) == 2

    def test_trigger_analysis_success(self, client, test_settings, auth_headers):
        """Test triggering analysis."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123/analyze"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "analysis-123",
                    "cleaned_entry_id": "cleanup-123",
                    "profile_id": "generic-conversation-summary",
                    "profile_label": "Conversation Summary",
                    "status": "processing",
                    "created_at": "2025-01-01T00:00:00Z",
                    "message": "Analysis started",
                },
            )
        )

        response = client.post(
            "/api/cleaned-entries/cleanup-123/analyze",
            json={"profile_id": "generic-conversation-summary"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "analysis-123"
        assert data["status"] == "processing"

    def test_trigger_analysis_default_profile(self, client, test_settings, auth_headers):
        """Test triggering analysis with default profile."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/cleaned-entries/cleanup-123/analyze"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "analysis-123",
                    "cleaned_entry_id": "cleanup-123",
                    "profile_id": "generic-conversation-summary",
                    "status": "processing",
                },
            )
        )

        # Call without specifying profile_id
        response = client.post("/api/cleaned-entries/cleanup-123/analyze", headers=auth_headers)

        assert response.status_code == 200

    def test_get_analysis_success(self, client, test_settings, auth_headers):
        """Test getting analysis result."""
        respx.get(
            f"{test_settings.CORE_API_URL}/api/v1/analyses/analysis-123"
        ).mock(
            return_value=Response(
                200,
                json={
                    "id": "analysis-123",
                    "cleaned_entry_id": "cleanup-123",
                    "profile_id": "generic-conversation-summary",
                    "profile_label": "Conversation Summary",
                    "status": "completed",
                    "result": {
                        "summary": "A conversation about transcription.",
                        "topics": ["transcription", "audio"],
                        "key_points": ["Point 1", "Point 2"],
                    },
                    "model_name": "llama3",
                    "created_at": "2025-01-01T00:00:00Z",
                },
            )
        )

        response = client.get("/api/analyses/analysis-123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "analysis-123"
        assert data["status"] == "completed"
        assert "summary" in data["result"]


class TestErrorHandling:
    """Tests for error handling."""

    def test_core_api_connection_error(self, client, test_settings, auth_headers):
        """Test handling of Core API connection errors."""
        import httpx

        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries").mock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        response = client.get("/api/entries", headers=auth_headers)

        assert response.status_code == 503

    def test_core_api_500_error(self, client, test_settings, auth_headers):
        """Test handling of Core API 500 errors."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries").mock(
            return_value=Response(
                500,
                json={"detail": "Internal server error"},
            )
        )

        response = client.get("/api/entries", headers=auth_headers)

        assert response.status_code == 500
