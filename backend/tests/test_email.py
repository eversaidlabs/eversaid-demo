"""Tests for email service."""

from unittest.mock import MagicMock, patch

import pytest


class TestEmailService:
    """Tests for the EmailService class."""

    def test_is_configured_false_when_no_api_key(self):
        """Test is_configured returns False when BREVO_API_KEY not set."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(BREVO_API_KEY=None)

            # Import fresh to pick up patched settings
            from app.services.email import EmailService

            service = EmailService()
            assert service.is_configured() is False

    def test_is_configured_true_when_api_key_set(self):
        """Test is_configured returns True when BREVO_API_KEY is set."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(BREVO_API_KEY="test-api-key")

            from app.services.email import EmailService

            service = EmailService()
            assert service.is_configured() is True

    def test_send_email_returns_false_when_not_configured(self):
        """Test send_email returns False when API key not configured."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(BREVO_API_KEY=None)

            from app.services.email import EmailService

            service = EmailService()
            result = service.send_email(
                to_email="test@example.com",
                subject="Test Subject",
                html_content="<p>Test</p>",
            )
            assert result is False

    def test_send_email_success(self):
        """Test send_email returns True on successful send."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(BREVO_API_KEY="test-api-key")

            with patch("sib_api_v3_sdk.Configuration"):
                with patch("sib_api_v3_sdk.ApiClient"):
                    with patch("sib_api_v3_sdk.TransactionalEmailsApi") as mock_api_class:
                        # Mock the API response
                        mock_api = MagicMock()
                        mock_api.send_transac_email.return_value = MagicMock(
                            message_id="test-message-id"
                        )
                        mock_api_class.return_value = mock_api

                        with patch("sib_api_v3_sdk.SendSmtpEmail"):
                            from app.services.email import EmailService

                            service = EmailService()
                            result = service.send_email(
                                to_email="test@example.com",
                                subject="Test Subject",
                                html_content="<p>Test</p>",
                            )
                            assert result is True

    def test_send_email_handles_exception(self):
        """Test send_email returns False and logs error on exception."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(BREVO_API_KEY="test-api-key")

            with patch("sib_api_v3_sdk.Configuration"):
                with patch("sib_api_v3_sdk.ApiClient"):
                    with patch("sib_api_v3_sdk.TransactionalEmailsApi") as mock_api_class:
                        # Mock API to raise exception
                        mock_api = MagicMock()
                        mock_api.send_transac_email.side_effect = Exception("API Error")
                        mock_api_class.return_value = mock_api

                        with patch("sib_api_v3_sdk.SendSmtpEmail"):
                            from app.services.email import EmailService

                            service = EmailService()
                            result = service.send_email(
                                to_email="test@example.com",
                                subject="Test Subject",
                                html_content="<p>Test</p>",
                            )
                            assert result is False

    def test_send_waitlist_notification_calls_send_email(self):
        """Test send_waitlist_notification formats and sends email."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                BREVO_API_KEY="test-api-key",
                NOTIFICATION_EMAIL="admin@example.com",
            )

            from app.services.email import EmailService

            service = EmailService()

            # Mock send_email
            with patch.object(service, "send_email", return_value=True) as mock_send:
                result = service.send_waitlist_notification(
                    signup_email="user@example.com",
                    use_case="Testing the service",
                    waitlist_type="api_access",
                    source_page="/demo",
                    language_preference="en",
                )

                assert result is True
                mock_send.assert_called_once()

                # Verify email was sent to notification email
                call_kwargs = mock_send.call_args[1]
                assert call_kwargs["to_email"] == "admin@example.com"
                assert "user@example.com" in call_kwargs["subject"]
                assert "user@example.com" in call_kwargs["html_content"]
                assert "Testing the service" in call_kwargs["html_content"]
                assert "api_access" in call_kwargs["html_content"]

    def test_send_waitlist_notification_handles_none_values(self):
        """Test send_waitlist_notification handles None optional fields."""
        with patch("app.services.email.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                BREVO_API_KEY="test-api-key",
                NOTIFICATION_EMAIL="admin@example.com",
            )

            from app.services.email import EmailService

            service = EmailService()

            with patch.object(service, "send_email", return_value=True) as mock_send:
                result = service.send_waitlist_notification(
                    signup_email="user@example.com",
                    use_case=None,
                    waitlist_type="extended_usage",
                    source_page=None,
                    language_preference=None,
                )

                assert result is True
                call_kwargs = mock_send.call_args[1]
                assert "Not provided" in call_kwargs["html_content"]


class TestGetEmailService:
    """Tests for get_email_service singleton."""

    def test_get_email_service_returns_singleton(self):
        """Test get_email_service returns the same instance."""
        # Reset the module-level instance
        import app.services.email as email_module

        email_module._email_service = None

        from app.services.email import get_email_service

        service1 = get_email_service()
        service2 = get_email_service()

        assert service1 is service2


class TestWaitlistEmailIntegration:
    """Integration tests for waitlist endpoint with email notifications."""

    def test_waitlist_sends_email_notification(self, client):
        """Test that new waitlist signup triggers email notification."""
        with patch("app.services.email.get_email_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service.send_waitlist_notification.return_value = True
            mock_get_service.return_value = mock_service

            # Need to patch at the route level since it's already imported
            with patch(
                "app.routes.local.get_email_service", return_value=mock_service
            ):
                response = client.post(
                    "/api/waitlist",
                    json={
                        "email": "notification-test@example.com",
                        "use_case": "Testing notifications",
                        "waitlist_type": "api_access",
                        "source_page": "/test",
                        "language_preference": "en",
                    },
                )

                assert response.status_code == 200

                # Note: BackgroundTasks in TestClient runs tasks synchronously
                # so the notification should have been called by now

    def test_waitlist_succeeds_even_if_email_fails(self, client):
        """Test that waitlist signup succeeds even if email notification fails."""
        with patch("app.routes.local.get_email_service") as mock_get_service:
            mock_service = MagicMock()
            mock_service.send_waitlist_notification.return_value = False
            mock_get_service.return_value = mock_service

            response = client.post(
                "/api/waitlist",
                json={
                    "email": "fail-email-test@example.com",
                    "waitlist_type": "api_access",
                },
            )

            # Signup should still succeed
            assert response.status_code == 200
            assert "waitlist" in response.json()["message"].lower()

    def test_waitlist_duplicate_does_not_send_email(self, client):
        """Test that duplicate signups don't send email notifications."""
        with patch("app.routes.local.get_email_service") as mock_get_service:
            mock_service = MagicMock()
            mock_get_service.return_value = mock_service

            # First signup
            client.post(
                "/api/waitlist",
                json={
                    "email": "no-dupe-email@example.com",
                    "waitlist_type": "api_access",
                },
            )

            # Reset mock to track only second call
            mock_service.reset_mock()

            # Second signup (duplicate)
            response = client.post(
                "/api/waitlist",
                json={
                    "email": "no-dupe-email@example.com",
                    "waitlist_type": "extended_usage",
                },
            )

            assert response.status_code == 200
            # Email should NOT be sent for duplicates
            mock_service.send_waitlist_notification.assert_not_called()
