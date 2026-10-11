# Project Architecture & System Design — Home Credit AI Voice Agent

## 1. High-Level Architectural Flow

```
+-------------------------------------------------------------------------+
|                              CLIENT (BROWSER)                           |
|                                                                         |
|  [Customer Voice]                                                       |
|         │                                                               |
|         ▼                                                               |
|  [Web Speech STT] ──► [Editable Text Preview] ──► [HTTP POST /api/...]  |
|                                                               │         |
|  [Web Speech TTS] ◄── [Clean Spoken Text] ◄───────────────────┼─────────┤
|                                                               │         |
+---------------------------------------------------------------┼---------+
                                                                │
                                                                ▼
+-------------------------------------------------------------------------+
|                        BACKEND ENGINE (NODE.JS / EXPRESS)               |
|                                                                         |
|  1. Input Validation & Stage Guard                                      |
|  2. NLP Heuristic Fact Extractor (Indian Currency & Regex Rules)        |
|  3. OpenRouter Gateway (Structured Extraction + Conversational Prompt)  |
|  4. Merge Confirmed Facts & Resolve Corrections                         |
|  5. Rule Evaluator (Policy Check: 7 criteria, max 75L, tenure 3-15 yrs) |
|  6. State Machine (Transitions stage, determines earliest missing Q)    |
|  7. Deterministic Safety Post-Validation (Overrides illegal approvals)  |
|  8. Return Structured State, Next Question, & Spoken Dialogue           |
+-------------------------------------------------------------------------+
```

---

## 2. Component Decoupling & Separation of Concerns

1. **Deterministic Rule Evaluator (`server/src/engine/rule-evaluator.ts`)**:
   - Implemented in strict TypeScript logic, not in an LLM prompt.
   - Decides whether a customer is qualified, disqualified, needs a balance transfer specialist, or requested a callback.
   - The LLM is **never** granted authority to bypass or invent eligibility criteria.

2. **OpenRouter Service Gateway (`server/src/services/openrouter.ts`)**:
   - Acts as an isolated adapter communicating with `https://openrouter.ai/api/v1/chat/completions`.
   - Uses strict timeouts (AbortController), JSON schema validation with **Zod**, and safe error classification (401, 402, 404, 429).
   - If the LLM connection fails or has zero credits, the application gracefully falls back to the deterministic local engine.

3. **NLP Extractor (`server/src/engine/nlp-extractor.ts`)**:
   - Normalizes Indian numerical expressions ("50 lakh" -> 5,000,000, "1 crore" -> 10,000,000).
   - Detects multi-fact statements out-of-order and customer corrections ("tenure is 10 years, actually make that 12").
   - Identifies diversions such as interest-rate inquiries without fabricating interest percentages.

4. **Web Speech Client Hooks**:
   - `useSpeechRecognition`: Manages microphone permissions, interim speech previews, speech finalization, and locale selection (`en-IN`, `en-US`, `hi-IN`).
   - `useSpeechSynthesis`: Manages speech utterance cancellation, speech rate adjustments, voice selection, and muting.

---

## 3. Directory Structure

```
d:\Voice_Agent\
├── client\                  # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src\
│   │   ├── components\      # Navbar, Sidebar
│   │   ├── hooks\           # useSpeechRecognition, useSpeechSynthesis
│   │   ├── services\        # api.ts, storage.ts
│   │   ├── views\           # Overview, VoiceAgent, Scenarios, History, Analytics, Settings
│   │   ├── types.ts         # Frontend domain interfaces
│   │   └── App.tsx          # Root application layout
│   └── package.json
│
├── server\                  # Node.js + Express + TypeScript + Vitest
│   ├── prompts\             # home-credit-agent.md
│   ├── knowledge\           # home-credit-product.md
│   ├── src\
│   │   ├── engine\          # rule-evaluator.ts, nlp-extractor.ts, state-machine.ts, orchestrator.ts
│   │   ├── services\        # openrouter.ts
│   │   ├── scenarios\       # definitions.ts, runner.ts
│   │   ├── routes\          # api.ts
│   │   ├── types.ts         # Backend domain interfaces
│   │   └── index.ts         # Server entry point
│   ├── tests\               # Vitest automated test suite (46 tests)
│   └── package.json
│
├── docs\                    # Technical & compliance documentation
├── .env.example             # Environment template
└── package.json             # Root workspace orchestrator
```
