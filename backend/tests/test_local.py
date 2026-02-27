"""Tests for local-only endpoints (feedback and waitlist)."""

import respx
from httpx import Response


class TestFeedbackEndpoints:
    """Tests for feedback submission and retrieval."""

    def test_submit_feedback_success(self, client, test_settings, auth_headers):
        """Test successful feedback submission."""
        # Mock entry exists in Core API
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={
                    "id": "entry-123",
                    "original_filename": "test.mp3",
                },
            )
        )

        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 4,
                "feedback_text": "Good transcription quality",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["entry_id"] == "entry-123"
        assert data["feedback_type"] == "transcription"
        assert data["rating"] == 4
        assert data["feedback_text"] == "Good transcription quality"
        assert "id" in data
        assert "created_at" in data

    def test_submit_feedback_entry_not_found(self, client, test_settings, auth_headers):
        """Test feedback submission when entry doesn't exist."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/nonexistent").mock(
            return_value=Response(
                404,
                json={"detail": "Entry not found"},
            )
        )

        response = client.post(
            "/api/entries/nonexistent/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 4,
            },
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_submit_feedback_invalid_type(self, client, test_settings, auth_headers):
        """Test feedback submission with invalid feedback_type."""
        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "invalid_type",
                "rating": 4,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_submit_feedback_invalid_rating_too_low(self, client, test_settings, auth_headers):
        """Test feedback submission with rating below 1."""
        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 0,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_submit_feedback_invalid_rating_too_high(self, client, test_settings, auth_headers):
        """Test feedback submission with rating above 5."""
        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 6,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_submit_feedback_text_too_long(self, client, test_settings, auth_headers):
        """Test feedback submission with text exceeding 1000 chars."""
        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 4,
                "feedback_text": "x" * 1001,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_submit_feedback_upsert(self, client, test_settings, auth_headers):
        """Test that second submission updates existing feedback."""
        # Mock entry exists
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        # First submission
        response1 = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 3,
                "feedback_text": "Initial feedback",
            },
            headers=auth_headers,
        )
        assert response1.status_code == 200
        feedback_id = response1.json()["id"]

        # Second submission (same type) - should update
        response2 = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 5,
                "feedback_text": "Updated feedback",
            },
            headers=auth_headers,
        )
        assert response2.status_code == 200
        data = response2.json()
        assert data["id"] == feedback_id  # Same ID = updated, not new
        assert data["rating"] == 5
        assert data["feedback_text"] == "Updated feedback"

    def test_submit_feedback_different_types(self, client, test_settings, auth_headers):
        """Test that different feedback types create separate records."""
        # Mock entry exists
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        # Submit transcription feedback
        response1 = client.post(
            "/api/entries/entry-123/feedback",
            json={"feedback_type": "transcription", "rating": 4},
            headers=auth_headers,
        )
        assert response1.status_code == 200
        id1 = response1.json()["id"]

        # Submit cleanup feedback (different type)
        response2 = client.post(
            "/api/entries/entry-123/feedback",
            json={"feedback_type": "cleanup", "rating": 5},
            headers=auth_headers,
        )
        assert response2.status_code == 200
        id2 = response2.json()["id"]

        # Should be different records
        assert id1 != id2

    def test_submit_feedback_all_types(self, client, test_settings, auth_headers):
        """Test all valid feedback types."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        for feedback_type in ["transcription", "cleanup", "analysis"]:
            response = client.post(
                "/api/entries/entry-123/feedback",
                json={"feedback_type": feedback_type, "rating": 4},
                headers=auth_headers,
            )
            assert response.status_code == 200
            assert response.json()["feedback_type"] == feedback_type

    def test_get_feedback_empty(self, client, test_settings, auth_headers):
        """Test getting feedback when none exists."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        response = client.get("/api/entries/entry-123/feedback", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_get_feedback_entry_not_found(self, client, test_settings, auth_headers):
        """Test getting feedback when entry doesn't exist."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/nonexistent").mock(
            return_value=Response(
                404,
                json={"detail": "Entry not found"},
            )
        )

        response = client.get("/api/entries/nonexistent/feedback", headers=auth_headers)

        assert response.status_code == 404

    def test_get_feedback_returns_all_types(self, client, test_settings, auth_headers):
        """Test getting all feedback for an entry."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        # Submit multiple feedback types
        for feedback_type in ["transcription", "cleanup", "analysis"]:
            client.post(
                "/api/entries/entry-123/feedback",
                json={"feedback_type": feedback_type, "rating": 4},
                headers=auth_headers,
            )

        # Get all feedback
        response = client.get("/api/entries/entry-123/feedback", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        types = {f["feedback_type"] for f in data}
        assert types == {"transcription", "cleanup", "analysis"}

    def test_submit_feedback_without_text(self, client, test_settings, auth_headers):
        """Test feedback submission without optional text."""
        respx.get(f"{test_settings.CORE_API_URL}/api/v1/entries/entry-123").mock(
            return_value=Response(
                200,
                json={"id": "entry-123", "original_filename": "test.mp3"},
            )
        )

        response = client.post(
            "/api/entries/entry-123/feedback",
            json={
                "feedback_type": "transcription",
                "rating": 5,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["feedback_text"] is None


class TestWaitlistEndpoints:
    """Tests for waitlist signup."""

    def test_join_waitlist_success(self, client):
        """Test successful waitlist signup."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "test@example.com",
                "use_case": "I'm a therapist",
                "waitlist_type": "api_access",
                "source_page": "/demo",
                "language_preference": "sl",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "waitlist" in data["message"].lower()

    def test_join_waitlist_invalid_email(self, client):
        """Test waitlist signup with invalid email."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "not-an-email",
                "waitlist_type": "api_access",
            },
        )

        assert response.status_code == 422

    def test_join_waitlist_duplicate_email(self, client):
        """Test waitlist signup with duplicate email returns success."""
        # First signup
        response1 = client.post(
            "/api/waitlist",
            json={
                "email": "duplicate@example.com",
                "waitlist_type": "api_access",
            },
        )
        assert response1.status_code == 200

        # Second signup with same email - should still return success
        response2 = client.post(
            "/api/waitlist",
            json={
                "email": "duplicate@example.com",
                "waitlist_type": "extended_usage",
            },
        )
        assert response2.status_code == 200
        # Should return same success message, not leak that email exists
        assert "message" in response2.json()

    def test_join_waitlist_api_access_type(self, client):
        """Test waitlist signup with api_access type."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "api@example.com",
                "waitlist_type": "api_access",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_extended_usage_type(self, client):
        """Test waitlist signup with extended_usage type."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "extended@example.com",
                "waitlist_type": "extended_usage",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_invalid_type(self, client):
        """Test waitlist signup with invalid waitlist_type."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "test@example.com",
                "waitlist_type": "invalid_type",
            },
        )

        assert response.status_code == 422

    def test_join_waitlist_minimal_fields(self, client):
        """Test waitlist signup with only required fields."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "minimal@example.com",
                "waitlist_type": "api_access",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_use_case_too_long(self, client):
        """Test waitlist signup with use_case exceeding 500 chars."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "test@example.com",
                "waitlist_type": "api_access",
                "use_case": "x" * 501,
            },
        )

        assert response.status_code == 422

    def test_join_waitlist_with_source_page(self, client):
        """Test waitlist signup with source_page."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "source@example.com",
                "waitlist_type": "api_access",
                "source_page": "/api-docs",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_with_language_preference(self, client):
        """Test waitlist signup with language_preference."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "lang@example.com",
                "waitlist_type": "extended_usage",
                "language_preference": "sl",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_with_language_preference_other(self, client):
        """Test waitlist signup with 'other' language preference."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "lang-other@example.com",
                "waitlist_type": "extended_usage",
                "language_preference": "other: Japanese",
            },
        )

        assert response.status_code == 200

    def test_join_waitlist_language_preference_too_long(self, client):
        """Test waitlist signup with language_preference exceeding 20 chars."""
        response = client.post(
            "/api/waitlist",
            json={
                "email": "lang-long@example.com",
                "waitlist_type": "extended_usage",
                "language_preference": "x" * 41,
            },
        )

        assert response.status_code == 422


class TestConfigEndpoint:
    """Tests for runtime config endpoint."""

    def test_get_config_returns_posthog_settings(self, client, test_settings):
        """Test that /api/config returns PostHog configuration."""
        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        assert "posthog" in data
        assert "key" in data["posthog"]
        assert "host" in data["posthog"]

    def test_get_config_returns_empty_key_when_not_set(self, client):
        """Test that /api/config returns empty key when POSTHOG_KEY not set."""
        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        # Default is empty string
        assert data["posthog"]["key"] == ""

    def test_get_config_returns_default_host(self, client):
        """Test that /api/config returns default host /ingest when not set."""
        response = client.get("/api/config")

        assert response.status_code == 200
        data = response.json()
        assert data["posthog"]["host"] == "/ingest"
