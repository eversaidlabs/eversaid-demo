# Cookie Policy

**EverSaid (eversaid.ai)**
**Last updated:** 15 March 2026

---

## What Are Cookies

Cookies are small text files stored on your device when you visit a website. They serve various purposes, from keeping you logged in to helping us understand how you use our service.

---

## Legal Framework

Our use of cookies is governed by the ePrivacy Directive (2002/58/EC) Article 5(3), as implemented in Slovenian law, and the GDPR. Under these rules:

- **Essential cookies** that are strictly necessary for the service to function may be set without consent.
- **Non-essential cookies** (such as analytics) require your explicit consent before being set.

---

## Cookies We Use

### Essential Cookies (Always Active - No Consent Required)

These cookies are strictly necessary for EverSaid to function. They are exempt from the consent requirement under ePrivacy Directive Article 5(3) because the service cannot operate properly without them.

| Cookie Name | Purpose | Duration | Type |
|-------------|---------|----------|------|
| `NEXT_LOCALE` | Stores your language preference (Slovenian or English) | 1 year | SameSite=Lax |
| `eversaid_access_token` | JWT authentication token for your session (pilot users only) | 30 days | httpOnly, SameSite=Lax |
| `eversaid_refresh_token` | JWT refresh token for session renewal (pilot users only) | 30 days | httpOnly, SameSite=Lax |

Authentication cookies (`eversaid_access_token` and `eversaid_refresh_token`) are only set when you log in as a pilot user. They are httpOnly, meaning they cannot be accessed by JavaScript, which protects against cross-site scripting (XSS) attacks.

### Analytics Cookies (Consent Required)

These cookies are only set if you explicitly consent. They help us understand how people use EverSaid so we can improve the service.

| Cookie Name | Service | Purpose | Duration |
|-------------|---------|---------|----------|
| `ph_*` | PostHog | Product analytics: page views, feature usage, user journeys | Set by PostHog |

PostHog analytics data is processed on PostHog's EU servers (eu.posthog.com). In demo mode, analytics are anonymous. In pilot mode, person profiles are only created for identified users (those who have logged in).

---

## Your Choices

**Analytics cookies:** You can accept or decline analytics cookies when first visiting the site. You can change your preference at any time by clicking "Cookie Settings" in the footer.

**Browser settings:** You can also control cookies through your browser settings. Note that blocking essential cookies may prevent the service from functioning correctly.

---

## Third-Party Cookies

We do not use any third-party advertising or tracking cookies. The only third-party service that sets cookies is PostHog for product analytics, and only with your consent.

---

## Contact

For questions about our use of cookies:

Gašper Merela
Email: privacy@eversaid.ai
