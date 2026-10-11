# System Limitations & Boundary Conditions

This document honestly outlines the scope, technical limitations, and deliberate design boundaries of the current implementation.

---

## 1. Scope & Telephony Boundaries
- **Simulation Only**: This application is a web-based conversational simulator. It does not interface with telephony providers (e.g. Twilio, Exotel, Asterisk) to originate cellular or landline phone calls.
- **Preliminary Screening**: Reaching the `QUALIFIED_FOR_HUMAN_HANDOFF` outcome does not constitute a legally binding loan sanction or approved disbursement. Final underwriting requires legal scrutiny of title deeds and technical property valuation.

---

## 2. Speech & Browser Boundaries
- **Browser-Native Web Speech API**:
  - The implementation uses browser-native SpeechRecognition and SpeechSynthesis to avoid requiring paid third-party voice platform API keys (like ElevenLabs or Deepgram).
  - Speech recognition accuracy depends on browser implementation and the user's microphone quality.
  - While Google Chrome and Microsoft Edge provide robust speech recognition, Mozilla Firefox lacks native SpeechRecognition. A graceful text-based fallback is provided.
- **Noise Cancellation**: Browser-native speech recognition does not include server-grade neural beamforming or noise cancellation.

---

## 3. Product & Financial Boundaries
- **Interest Rates**: The system adheres strictly to the rule that interest rates are personalized post-qualification by senior credit underwriters. The agent will not negotiate, quote, or invent interest rates.
- **Credit Bureau (CIBIL) Checks**: Live credit bureau score pulls are outside the scope of this preliminary screening simulator.

---

## 4. LLM & Connectivity Boundaries
- **OpenRouter Quota**: When calling OpenRouter live, API latency and availability depend on OpenRouter and the chosen upstream provider (e.g., Google, Meta, Anthropic).
- **Offline / Zero-Credit Fallback**: When an API key is missing or quota is exhausted, the application operates via its built-in deterministic rule engine, ensuring zero downtime for evaluating the 16+ test scenarios.
