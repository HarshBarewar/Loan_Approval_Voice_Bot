# Home Credit AI Voice Agent — Loan Against Property (LAP) Qualification

[![Automated Tests](https://img.shields.io/badge/Vitest-46%20Passed-emerald.svg)](#automated-testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20NodeNext-blue.svg)](https://www.typescriptlang.org/)
[![LLM Gateway](https://img.shields.io/badge/OpenRouter-Chat%20Completions-purple.svg)](https://openrouter.ai/)
[![Web Speech API](https://img.shields.io/badge/Browser%20Voice-STT%20%2B%20TTS-red.svg)](#voice-architecture)

> **Assignment Demonstration Notice:** This project is a production-minded conversational AI demonstration simulating a Home Credit customer qualification call for a Loan Against Property (LAP) pre-approval campaign. It is an autonomous screening simulator and does not place actual telephony calls to real customers or issue legal loan sanctions.

---

## 1. Executive Summary & Capabilities

The **Home Credit AI Voice Agent** evaluates customer eligibility for a Loan Against Property (up to ₹75 Lakhs) using interactive voice conversation. The application combines **browser-native speech recognition**, **OpenRouter LLM gateway integration**, and a **deterministic business rules state machine**:

1. **Microphone Voice Input**: User speaks into the microphone; speech is converted to text in real-time via the browser's Web Speech API (supporting English and Hindi).
2. **Natural Dialogue & NLP**: Handles natural conversational answers, Indian currency expressions (*"50 lakhs"*, *"1.5 crore"*), out-of-order multi-fact answers, and customer corrections.
3. **Strict Business Rule Enforcement**: Evaluates the **7 core criteria** in backend TypeScript logic independently of the LLM. Disqualifies ineligible customers immediately and detects loan transfer / EMI-reduction cases for specialist handoff.
4. **Speech Synthesis**: Speaks assistant responses aloud using browser-native text-to-speech with customizable voices and playback rates.
5. **Interactive UI/UX**: Enterprise financial-services dashboard with active call visualizer, live transcript preview, real-time checklist tracking, 16+ automated test scenarios, local conversation history, and analytics.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons.
- **Backend**: Node.js (v22), Express, TypeScript, Zod schema validation, CORS.
- **LLM Gateway**: OpenRouter Chat Completions API (`https://openrouter.ai/api/v1/chat/completions`) with configurable model (default: `google/gemini-2.0-flash-001`).
- **Voice Engine**: Browser-native Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) with graceful manual text input fallback.
- **Testing**: Vitest, Supertest (46 automated tests covering all 34 business rules, OpenRouter mocks, and API routes).

---

## 3. Quick Start Guide

### Step 1: Clone and Install Dependencies
```bash
git clone <repo-url>
cd Voice_Agent
npm install
```

### Step 2: Configure Environment Variables
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your OpenRouter API Key:
```env
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key-here
OPENROUTER_MODEL=google/gemini-2.0-flash-001
PORT=3001
```

> **Zero Extra Paid Secrets**: Browser-native Web Speech is used for STT and TTS. No separate ElevenLabs, Deepgram, or paid telephony credentials are required. If an OpenRouter key is not yet configured, the system automatically runs using its built-in **Deterministic Fallback Engine** so you can test all scenarios immediately.

### Step 3: Run the Application
Start both the backend server and frontend client concurrently:
```bash
npm run dev
```

- **Frontend Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 4. Key Application Views

1. **Overview Dashboard**: System status indicators, OpenRouter connection health, browser audio capabilities, local test metrics, and quick-start button.
2. **Voice Agent Workspace**:
   - *Left Panel*: Call status indicator, prominent microphone button, live speech preview, editable text input, audio controls (mute, replay, speech rate, voice selector), and scrollable message transcript.
   - *Right Panel*: Real-time 7-item qualification checklist, overall eligibility badge, routing reason, and next missing question callout.
3. **Test Scenarios**: Predefined test cases covering all 16+ edge cases (agricultural land, missing deeds, cash income, tenure <3 / >15 years, cap acceptance/decline, out-of-order facts, corrections, interruptions) with batch execution and script inspection.
4. **Conversation History**: Local demo call history with outcome filters, transcript audits, and one-click JSON and text exports.
5. **Analytics**: Aggregate qualification rates, criteria failure breakdowns, and outcome distribution charts.
6. **Settings**: OpenRouter API key status, model picker, live connection testing, and voice preferences.

---

## 5. Home Credit LAP Business Rules Summary

| # | Eligibility Criterion | Acceptable Condition | Disqualification / Routing Condition |
|---|-----------------------|----------------------|--------------------------------------|
| 1 | **Property Type** | Residential, Commercial, Industrial | **Agricultural property** triggers immediate `DISQUALIFIED`. |
| 2 | **Ownership Status** | Sole ownership or Joint ownership (Both are 100% eligible) | Joint ownership is fully accepted. |
| 3 | **Original Documents** | Original title deeds available for verification (at home, locker, etc.) | **Photocopies only / missing originals** triggers immediate `DISQUALIFIED`. |
| 4 | **Desired Loan Amount** | Up to ₹75,00,000 (₹75 Lakhs) | If > ₹75L requested, offers ₹75L cap alternative. If declined, marked `MAXIMUM_AMOUNT_NOT_ACCEPTED`. |
| 5 | **Occupation & Income Mode** | Salaried or Self-employed via **Bank Account** | **Cash income** triggers immediate `DISQUALIFIED`. |
| 6 | **Property Market Value** | Estimated market value in INR | **No arbitrary minimum threshold**. Never disqualify on market value. |
| 7 | **Desired Tenure** | 3 to 15 Years inclusive | Tenures **< 3 years** or **> 15 years** trigger immediate `DISQUALIFIED`. |
| — | **Existing Property Loan** | Fresh LAP request | Triggers immediate routing to `LOAN_TRANSFER_SPECIALIST_REQUIRED`. |
| — | **EMI Reduction Request** | Fresh LAP request | Triggers immediate routing to `LOAN_TRANSFER_SPECIALIST_REQUIRED`. |
| — | **Customer Busy** | Available to converse | Records callback preference and ends as `CALLBACK_REQUESTED`. |

---

## 6. Automated Testing

Run the full automated test suite:
```bash
npm run test
```

### Test Coverage Highlights (46 Tests)
- **Business Logic Tests (1 - 34)**:
  - Fully eligible customer reaching `QUALIFIED_FOR_HUMAN_HANDOFF`
  - Agricultural property immediate disqualification
  - Joint ownership accepted
  - Unavailable original documents immediate disqualification
  - Cash income immediate disqualification
  - Tenure boundary tests (2 years fails, 3 years passes, 15 years passes, 16 years fails)
  - Loan amount cap alternative flow (accepting cap qualifies, declining cap ends flow)
  - Existing property loan & EMI reduction routing to specialist
  - Busy customer callback handling
  - Out-of-order multi-fact capture in a single turn
  - Customer answer corrections (e.g. updating tenure from 10 to 12 years)
  - Ambiguous document clarification trigger
  - Interruption handling (interest rate inquiry answered without fabricating rates)
  - Safe error recovery without illegal auto-approvals
- **OpenRouter Gateway Mock Tests**:
  - Missing API key detection
  - 401 Authentication failure handling
  - 402 Insufficient credits handling
  - 429 Rate limiting handling
  - Structured output parsing with Zod schema validation
- **API Endpoint Integration Tests**:
  - REST endpoints verification (`/api/health`, `/api/config/status`, `/api/conversations`, `/api/scenarios/run-all`)

---

## 7. Production Build & Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Starts Express backend and Vite frontend concurrently |
| `npm run build` | Compiles TypeScript and creates production frontend bundle |
| `npm run test` | Runs all 46 Vitest automated unit and integration tests |
| `npm run start` | Runs the compiled server from `server/dist/` |

---

## 8. Detailed Documentation

Detailed architectural and operational documentation is available in the [`docs/`](docs/) directory:
- [Setup & Configuration Guide](docs/SETUP_GUIDE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [System Architecture & Flow Diagram](docs/ARCHITECTURE.md)
- [Business Rules Reference](docs/BUSINESS_RULES.md)
- [Browser Speech Support Matrix](docs/SPEECH_SUPPORT.md)
- [Privacy & Security Compliance](docs/PRIVACY_SECURITY.md)
- [System Limitations & Boundary Conditions](docs/LIMITATIONS.md)

---

## 9. License & Attribution

Developed for the Home Credit Loan Against Property (LAP) AI Voice Agent Qualification Assignment.
All rights reserved.
#   L o a n _ A p p r o v a l _ V o i c e _ B o t  
 