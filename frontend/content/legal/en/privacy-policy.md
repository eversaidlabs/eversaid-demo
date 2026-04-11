# Privacy Policy

**EverSaid (eversaid.ai)**
**Last updated:** 15 March 2026
**Effective date:** 15 March 2026

---

## 1. Data Controller

Gašper Merela
Ljubljana, Slovenia

Email: privacy@eversaid.ai
Website: https://eversaid.ai

For the purposes of the EU General Data Protection Regulation (GDPR), the data controller for personal data processed through EverSaid is the individual named above.

---

## 2. What EverSaid Does

EverSaid is a transcription and text cleanup platform that converts audio recordings into text and cleans up existing transcripts using AI-powered speech-to-text technology and AI-assisted cleanup and analysis. The service is available in two modes:

- **Demo mode** - available at eversaid.ai without registration, subject to usage limits and the Terms of Service at https://eversaid.ai/terms
- **Pilot mode** - available to registered early-access users with extended capabilities

---

## 3. What Personal Data We Process

### 3.1 Your Account and Usage Data

This is data that relates directly to you as a user of EverSaid.

**Demo Mode (no registration required):**

| Data | Purpose | Legal Basis |
|------|---------|-------------|
| **IP address and browser metadata** | Security, abuse prevention, and basic server operation | Legitimate interest (Art. 6(1)(f)) - protecting the service from abuse |
| **Analytics data** (page views, page leave events) | Understanding how the service is used and improving it | Consent (Art. 6(1)(a)) - only collected if you accept analytics cookies |
| **Language preference** | Displaying the interface in your chosen language | Legitimate interest (Art. 6(1)(f)) - providing a usable interface |

**Pilot Mode (registered users), in addition to the above:**

| Data | Purpose | Legal Basis |
|------|---------|-------------|
| **Email address** | Account creation, authentication, and service communication | Contractual necessity (Art. 6(1)(b)) |
| **Authentication tokens** (stored as cookies) | Maintaining your logged-in session | Contractual necessity (Art. 6(1)(b)) |

### 3.2 Content Data - Audio, Transcripts, and Analysis

When you upload an audio file or text file (or paste text), EverSaid processes up to three categories of content data:

- **Audio files** you upload, which may contain the voices and spoken words of you and other individuals
- **Transcripts** generated from your audio, which may contain personal data spoken during the recording (names, opinions, personal circumstances, etc.)
- **Analysis results** generated from your transcripts, which may include summaries, extracted topics, or other insights derived from the spoken content

When you upload a text file or paste text directly (without audio), only transcript text and analysis results are processed - no audio file is involved.

| Data | Purpose | Legal Basis |
|------|---------|-------------|
| **Audio file** (demo mode) | Transcription and AI cleanup - this is the core service | Legitimate interest (Art. 6(1)(f)) - you initiate processing by uploading; see Section 4 for your responsibilities |
| **Audio file** (pilot mode) | Transcription, AI cleanup, and storage with no automatic expiration | Contractual necessity (Art. 6(1)(b)) - processing is required to deliver the service you registered for |
| **Text entry** (demo mode) | AI cleanup and analysis of pasted transcript | Legitimate interest (Art. 6(1)(f)) - you initiate processing by submitting text; see Section 4 for your responsibilities |
| **Text entry** (pilot mode) | AI cleanup, analysis, and storage with no automatic expiration | Contractual necessity (Art. 6(1)(b)) |
| **Transcript** (both modes) | Delivering the transcription result to you | Same legal basis as the corresponding audio file |
| **Analysis results** (both modes) | Providing AI-generated insights from your transcript | Same legal basis as the corresponding audio file |

**Important:** Your audio recordings, transcripts, and analysis results may contain personal data of individuals other than you (interviewees, meeting participants, callers). Please see Section 4 for your responsibilities regarding this content.

### 3.3 Data We Do Not Collect

We do not collect or process: names (unless included in your email address or audio content), phone numbers, payment information (the service is currently free), location data beyond IP address, or biometric data. While audio recordings contain voice data, we process audio solely for content extraction (transcription), not for speaker identification or voiceprint analysis. Under GDPR, this does not constitute biometric data processing under Article 9.

---

## 4. Your Responsibilities as an Uploader

When you upload audio recordings, upload text files, or paste transcript text into EverSaid, you act as the data controller for any personal data contained in those recordings or text. This means:

- **You are responsible** for ensuring you have the legal right to upload and process the recording. This includes having an appropriate legal basis (such as consent, contractual necessity, or legitimate interest) for processing the personal data of any individuals whose voices or personal information appear in the recording.
- **You are responsible** for informing the individuals in your recordings about the processing, as required by GDPR Articles 13 and 14, including the fact that their speech will be processed by AI transcription services.
- **You must not upload** recordings that you do not have the right to process, recordings obtained illegally, or recordings containing special category data (Article 9) without appropriate safeguards.

EverSaid processes your uploaded audio and text as a data processor acting on your instructions. We process Content Data solely to provide the transcription, cleanup, and analysis service - we do not access, review, or use the content of your recordings or text for any other purpose.

---

## 5. How Your Content Is Processed

### 5.1 Audio upload flow
When you upload an audio file:

1. **Your audio file** is uploaded to our server hosted by Hetzner Online GmbH in Germany.
2. **For transcription**, your audio is sent to ElevenLabs Inc. (United States) via their Scribe API for speech-to-text conversion.
3. **For AI cleanup and analysis**, the resulting transcript text (not audio) is sent to IONOS SE (Germany) for LLM-based text processing.
4. **The cleaned transcript and analysis results** are returned to you through our interface.

### 5.2 Text import flow
When you upload a text file or paste text directly:

1. **Your text** is stored on our server hosted by Hetzner Online GmbH in Germany.
2. **For AI cleanup and analysis**, the text is sent to IONOS SE (Germany) for LLM-based text processing.
3. **The cleaned text and analysis results** are returned to you through our interface.

No audio is involved. Your text is not sent to ElevenLabs.

Your audio file is never used to train AI models. We have opted out of model training with all our sub-processors where such an option is available.

---

## 6. Data Storage and Retention

### 6.1 Demo Mode

All demo content is tied to your anonymous session, which expires 30 days after creation. Content uploaded later in the session period will have a shorter effective retention.

| Data | Retention | Deletion |
|------|-----------|----------|
| Audio file | Deleted when anonymous session expires (30 days from session creation) | You can delete it at any time before expiry through the interface |
| Text entry | Deleted when anonymous session expires (30 days from session creation) | You can delete it at any time before expiry through the interface |
| Transcript | Deleted when anonymous session expires | Deleted when the associated audio file or text entry is deleted |
| Analysis results | Deleted when anonymous session expires | Deleted when the associated entry is deleted |
| Server logs (IP, metadata) | 30 days | Automatically deleted |
| Analytics data (PostHog) | As per PostHog's EU Cloud retention settings | You can request deletion - see Section 9 |

### 6.2 Pilot Mode

| Data | Retention | Deletion |
|------|-----------|----------|
| Email address | Until you request account deletion | On request - see Section 9 |
| Audio files | Until you delete them or request account deletion | You can delete individual entries or request full account deletion |
| Text entries | Until you delete them or request account deletion | You can delete individual entries or request full account deletion |
| Transcripts | Until you delete them or request account deletion | Deleted when the associated audio file or text entry is deleted |
| Analysis results | Until you delete them or request account deletion | Deleted when the associated entry is deleted |
| Authentication cookies | 30 days (automatically renewed on use) | Cleared on logout or expiry |
| Server logs | 30 days | Automatically deleted |

---

## 7. International Data Transfers

Some of our sub-processors are located outside the European Economic Area (EEA). We ensure that all international transfers of personal data are protected by appropriate safeguards as required by GDPR Chapter V:

| Sub-processor | Location | Transfer Safeguard |
|---------------|----------|-------------------|
| ElevenLabs Inc. | United States | EU-US Data Privacy Framework (DPF) + Standard Contractual Clauses (SCCs) in their DPA |

Sub-processors located within the EEA (Hetzner, IONOS, PostHog EU) do not require additional transfer safeguards.

All AI text processing (cleanup and analysis) uses IONOS (Germany), ensuring your transcript text remains within the EU.

---

## 8. Sub-processors

We use the following third-party services to operate EverSaid. A current list is always available at https://eversaid.ai/sub-processors.

| Sub-processor | Role | Location | Purpose | Data Processed |
|---------------|------|----------|---------|---------------|
| **Hetzner Online GmbH** | Data processor | Germany (EU) | Server hosting and file storage | Audio files, transcripts, user accounts, server logs |
| **ElevenLabs Inc.** | Sub-processor | United States | Speech-to-text transcription (Scribe API) | Audio files |
| **IONOS SE** | Sub-processor | Germany (EU) | LLM text processing | Transcript text (no audio) |
| **PostHog Inc.** | Data processor | EU (eu.posthog.com) | Product analytics | Page views, anonymized usage events, browser metadata |

We have Data Processing Agreements (DPAs) in place with all sub-processors. We will update the sub-processor list at https://eversaid.ai/sub-processors at least 14 days before engaging any new sub-processor.

---

## 9. Cookies

We use a limited number of cookies. For full details, see our Cookie Policy at https://eversaid.ai/cookies.

**Essential cookies** (language preference, authentication) are set without consent as they are strictly necessary for the service to function, in accordance with the ePrivacy Directive (2002/58/EC) Article 5(3).

**Analytics cookies** (PostHog) are only set with your explicit consent.

---

## 10. Your Rights Under GDPR

As a data subject in the EEA, you have the following rights:

- **Right of access** (Art. 15) - Request a copy of all personal data we hold about you.
- **Right to rectification** (Art. 16) - Request correction of inaccurate data.
- **Right to erasure** (Art. 17) - Request deletion of your data. You can delete your audio and transcripts through the interface. In pilot mode, you can also request full account deletion.
- **Right to restriction** (Art. 18) - Request that we limit processing of your data.
- **Right to data portability** (Art. 20) - Receive your data in a structured, machine-readable format.
- **Right to object** (Art. 21) - Object to processing based on legitimate interest.
- **Right to withdraw consent** (Art. 7(3)) - Withdraw consent for analytics cookies at any time without affecting the lawfulness of prior processing.

**How to exercise your rights:** Send an email to privacy@eversaid.ai with the subject "GDPR Request" and describe your request. We will respond within 30 days.

**Right to lodge a complaint:** You have the right to file a complaint with the Information Commissioner of the Republic of Slovenia (Informacijski pooblaščenec):

Informacijski pooblaščenec
Dunajska cesta 22, 1000 Ljubljana, Slovenia
Email: gp.ip@ip-rs.si
Website: https://www.ip-rs.si

---

## 11. Data Security

We implement the following technical and organizational measures to protect your data:

- **Encryption in transit**: All data is transmitted over HTTPS/TLS.
- **Access controls**: Access to servers and data is restricted to the data controller only.
- **Pilot mode encryption**: Audio files, transcripts, and analysis results for registered users are encrypted at the application level using envelope encryption with per-user keys.
- **Physical security**: All servers are hosted in Hetzner's ISO 27001 certified data centers in Germany with physical access controls and security monitoring.
- **Authentication security**: Session tokens are httpOnly and SameSite, preventing cross-site attacks.
- **Data minimization**: In demo mode, we do not require any personal information beyond the audio file you choose to upload. All demo data is automatically deleted after 30 days.
- **No model training**: Your audio and transcripts are never used to train AI models.

---

## 12. Third-Party Links

EverSaid may contain links to third-party websites or services. We are not responsible for the privacy practices of those websites. We encourage you to review the privacy policies of any third-party service you visit.

---

## 13. Children's Data

EverSaid is not intended for use by children under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at privacy@eversaid.ai and we will delete it.

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. For significant changes affecting your rights, we will notify pilot users by email.

---

## 15. Contact

For any questions about this Privacy Policy or our data practices:

Gašper Merela
Email: privacy@eversaid.ai
Website: https://eversaid.ai
