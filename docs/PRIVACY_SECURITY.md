# Privacy & Security Note — Home Credit AI Voice Agent

## 1. Credentials & API Key Safety
- **Strict Backend Storage**: The only user-provided secret is the OpenRouter API Key (`OPENROUTER_API_KEY`).
- **Zero Frontend Exposure**: The API key is stored exclusively on the server in `.env`. It is **never** sent to the client, logged in network responses, or stored in browser cookies or `localStorage`.
- **Git Protection**: `.env` and all credential patterns are included in `.gitignore`.

---

## 2. Customer Financial Data Privacy
- **No Sensitive Financial Data**: The voice agent conducts an initial preliminary qualification. It never requests passwords, PINs, OTPs, net-banking logins, Aadhaar numbers, or bank account numbers.
- **No Document Uploads**: The agent asks whether original property title deeds are available for verification; it does not request deed scans or file uploads.
- **Fictional Test Data**: All scenario test cases use synthetic customer personas (e.g., "Mr. Sharma").

---

## 3. Audio & Voice Data Handling
- **User-Initiated Microphone**: The microphone is never activated automatically in the background. Voice recording begins only when the user explicitly clicks the microphone button.
- **No Server Audio Uploads**: Microphone audio is transcribed locally in the browser using the Web Speech API. Raw audio bytes are never recorded, compressed, or uploaded to external servers.
- **Zero Telephony Claims**: The application does not place actual PSTN or VoIP calls to real telephone numbers.

---

## 4. Local Storage Hygiene
- Conversation transcripts and state are saved in the browser's `localStorage` solely for the demo session.
- Users can export their conversations as JSON/TXT and can wipe all local storage data at any time via the **Clear All Records** action in the History and Settings tabs.
