# Sub-processor List

**EverSaid (eversaid.ai)**
**Last updated:** 15 March 2026

EverSaid uses the following third-party sub-processors to deliver its service. This list is maintained in accordance with GDPR Article 28.

---

| Sub-processor | Role | Registered Location | Processing Location | Purpose | Data Processed | DPA |
|---------------|------|---------------------|--------------------|---------|--------------|----|
| **Hetzner Online GmbH** | Data processor | Gunzenhausen, Germany | Germany (EU) | Server hosting, file storage, database | Audio files, transcripts, user accounts, server logs | [Hetzner DPA](https://www.hetzner.com/legal/data-processing-agreement) |
| **ElevenLabs Inc.** | Sub-processor | New York, United States | United States | Speech-to-text transcription (Scribe API) | Audio files | [ElevenLabs DPA](https://elevenlabs.io/dpa) |
| **Groq Inc.** | Sub-processor | Mountain View, United States | United States | LLM text processing (demo mode only) | Transcript text (no audio) | Groq Terms of Service |
| **IONOS SE** | Sub-processor | Montabaur, Germany | Germany (EU) | LLM text processing (pilot mode only) | Transcript text (no audio) | IONOS DPA |
| **PostHog Inc.** | Data processor | London, United Kingdom | EU (eu.posthog.com) | Product analytics (consent-based only) | Page views, anonymized usage events, browser metadata | [PostHog DPA](https://posthog.com/dpa) |

---

## Notes

- **Audio files** are sent to ElevenLabs for transcription only. We have opted out of model training.
- **Text entries** (uploaded text files or pasted transcripts) are not sent to ElevenLabs. They go directly to Groq (demo) or IONOS (pilot) for cleanup and analysis.
- **Transcript text** (not audio) is sent to Groq (demo) or IONOS (pilot) for AI cleanup and analysis.
- **PostHog** analytics only collect data when the user has consented to analytics cookies. PostHog processes data on EU servers.
- **Pilot users** benefit from EU-only transcript processing via IONOS, meaning their transcript text does not leave the EU.

## Changes to This List

We will update this page at least 14 days before engaging a new sub-processor. If you wish to be notified of changes, contact privacy@eversaid.ai.
