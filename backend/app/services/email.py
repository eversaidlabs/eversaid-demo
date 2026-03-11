"""Email service for sending notifications via Brevo (Sendinblue)."""

import html
from typing import Optional

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("email")


class EmailService:
    """Service for sending emails via Brevo API."""

    def __init__(self):
        """Initialize email service with Brevo client."""
        self.settings = get_settings()
        self._api_instance: Optional[object] = None

    @property
    def api_instance(self):
        """Lazy-load Brevo API client."""
        if self._api_instance is None and self.settings.BREVO_API_KEY:
            import sib_api_v3_sdk

            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key["api-key"] = self.settings.BREVO_API_KEY
            self._api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )
        return self._api_instance

    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.settings.BREVO_API_KEY)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        sender_name: str = "EverSaid",
        sender_email: str = "waitlist@eversaid.ai",
    ) -> bool:
        """Send an email via Brevo.

        Args:
            to_email: Recipient email address.
            subject: Email subject.
            html_content: HTML content of the email.
            sender_name: Display name of the sender.
            sender_email: Email address of the sender.

        Returns:
            True if email was sent successfully, False otherwise.
        """
        if not self.is_configured():
            logger.warning("Email not sent - BREVO_API_KEY not configured")
            return False

        try:
            import sib_api_v3_sdk

            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email}],
                sender={"name": sender_name, "email": sender_email},
                subject=subject,
                html_content=html_content,
            )

            response = self.api_instance.send_transac_email(send_smtp_email)
            logger.info(
                "Email sent successfully",
                to=to_email,
                subject=subject,
                message_id=response.message_id,
            )
            return True

        except Exception as e:
            logger.error(
                "Failed to send email",
                to=to_email,
                subject=subject,
                error=str(e),
            )
            return False

    def send_waitlist_notification(
        self,
        signup_email: str,
        use_case: Optional[str],
        waitlist_type: str,
        source_page: Optional[str],
        language_preference: Optional[str],
    ) -> bool:
        """Send notification about a new waitlist signup.

        Args:
            signup_email: Email of the person who signed up.
            use_case: Their use case description.
            waitlist_type: Type of waitlist (api_access, extended_usage).
            source_page: Page where they signed up.
            language_preference: User's language preference.

        Returns:
            True if notification was sent successfully, False otherwise.
        """
        logger.info(
            "Sending waitlist notification email",
            signup_email=signup_email,
            to=self.settings.NOTIFICATION_EMAIL,
        )
        # Escape user inputs to prevent XSS in HTML emails
        safe_email = html.escape(signup_email)
        safe_use_case = html.escape(use_case or "Not provided")
        safe_type = html.escape(waitlist_type)
        safe_source = html.escape(source_page or "Not provided")
        safe_lang = html.escape(language_preference or "Not provided")

        subject = f"New Pilot Signup: {safe_email}"

        html_content = f"""
        <h2>New Pilot Program Signup</h2>
        <p><strong>Email:</strong> {safe_email}</p>
        <p><strong>Use Case:</strong> {safe_use_case}</p>
        <p><strong>Type:</strong> {safe_type}</p>
        <p><strong>Source Page:</strong> {safe_source}</p>
        <p><strong>Language:</strong> {safe_lang}</p>
        """

        return self.send_email(
            to_email=self.settings.NOTIFICATION_EMAIL,
            subject=subject,
            html_content=html_content,
        )


# Module-level instance for convenience
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get email service singleton instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
