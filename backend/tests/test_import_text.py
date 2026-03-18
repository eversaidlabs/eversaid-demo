"""Tests for the import-text endpoint."""

import respx
from httpx import Response


class TestImportTextEndpoint:
    """Tests for POST /api/import-text endpoint."""

    def test_import_text_success(self, client, test_settings, auth_headers):
        """Test successful text import request."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "transcription_id": "trans-123",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "processing",
                    "message": "Import successful, cleanup started",
                },
            )
        )

        response = client.post(
            "/api/import-text",
            json={
                "text": "Hello, this is a test transcript.",
                "language": "en",
                "cleanup_type": "clean",
            },
            headers=auth_headers,
        )

        assert response.status_code == 202
        data = response.json()
        assert data["entry_id"] == "entry-123"
        assert data["transcription_id"] == "trans-123"
        assert data["cleanup_id"] == "cleanup-123"
        assert data["cleanup_status"] == "processing"

    def test_import_text_with_analysis(self, client, test_settings, auth_headers):
        """Test text import with analysis profile."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "transcription_id": "trans-123",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "processing",
                    "analysis_id": "analysis-123",
                    "analysis_status": "pending",
                },
            )
        )

        response = client.post(
            "/api/import-text",
            json={
                "text": "Speaker 1: Hello.\nSpeaker 2: Hi there.",
                "language": "en",
                "cleanup_type": "clean",
                "analysis_profile": "generic-summary",
            },
            headers=auth_headers,
        )

        assert response.status_code == 202
        data = response.json()
        assert data["analysis_id"] == "analysis-123"
        assert data["analysis_status"] == "pending"

    def test_import_text_with_llm_model(self, client, test_settings, auth_headers):
        """Test text import with custom LLM model."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "transcription_id": "trans-123",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "processing",
                },
            )
        )

        response = client.post(
            "/api/import-text",
            json={
                "text": "Test transcript content.",
                "language": "sl",
                "cleanup_type": "edited",
                "llm_model": "llama3.3:70b",
            },
            headers=auth_headers,
        )

        assert response.status_code == 202

    def test_import_text_minimal_params(self, client, test_settings, auth_headers):
        """Test text import with only required parameters (defaults applied)."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                202,
                json={
                    "entry_id": "entry-123",
                    "transcription_id": "trans-123",
                    "cleanup_id": "cleanup-123",
                    "cleanup_status": "pending",
                },
            )
        )

        # Only text is required; language defaults to "en", cleanup_type to "clean"
        response = client.post(
            "/api/import-text",
            json={"text": "Minimal test."},
            headers=auth_headers,
        )

        assert response.status_code == 202

    def test_import_text_core_api_error(self, client, test_settings, auth_headers):
        """Test text import when Core API returns error."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                400,
                json={"detail": "Invalid cleanup type"},
            )
        )

        response = client.post(
            "/api/import-text",
            json={
                "text": "Test text.",
                "cleanup_type": "invalid",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400

    def test_import_text_missing_text(self, client, test_settings, auth_headers):
        """Test text import without text parameter (validation error)."""
        response = client.post(
            "/api/import-text",
            json={"language": "en"},
            headers=auth_headers,
        )

        # Pydantic validation should fail
        assert response.status_code == 422

    def test_import_text_core_api_500(self, client, test_settings, auth_headers):
        """Test text import when Core API returns 500."""
        respx.post(
            f"{test_settings.CORE_API_URL}/api/v1/import-and-cleanup"
        ).mock(
            return_value=Response(
                500,
                json={"detail": "Internal server error"},
            )
        )

        response = client.post(
            "/api/import-text",
            json={"text": "Test text."},
            headers=auth_headers,
        )

        assert response.status_code == 500

    def test_import_text_empty_text(self, client, auth_headers):
        """Test text import with empty text (validation error)."""
        response = client.post(
            "/api/import-text",
            json={"text": ""},
            headers=auth_headers,
        )

        # Pydantic validation should fail (min_length=1)
        assert response.status_code == 422

    def test_import_text_exceeding_max_length(self, client, auth_headers):
        """Test text import with text exceeding 500KB limit (validation error)."""
        # Create text just over the 500,000 character limit
        oversized_text = "a" * 500_001

        response = client.post(
            "/api/import-text",
            json={"text": oversized_text},
            headers=auth_headers,
        )

        # Pydantic validation should fail (max_length=500_000)
        assert response.status_code == 422
