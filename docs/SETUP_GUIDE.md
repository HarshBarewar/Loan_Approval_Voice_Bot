# Setup & Quick Start Guide — Home Credit AI Voice Agent

## 1. System Requirements
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.
- **Browser**: Any modern browser (Google Chrome, Microsoft Edge, Brave, Safari, or Firefox).
  - *Microphone voice recognition (STT)* works best in Chromium-based browsers (Chrome / Edge / Brave) via the native Web Speech API.
  - *Speech synthesis (TTS)* and *manual text fallback* are supported across all modern browsers.

---

## 2. Dependency Installation
In the project root directory, install all required workspace packages:
```bash
npm install
```
This automatically installs:
- Root workspace orchestrator (`concurrently`)
- Express backend dependencies (`express`, `cors`, `dotenv`, `zod`, `vitest`, `supertest`, `tsx`)
- React frontend dependencies (`react`, `react-dom`, `vite`, `tailwindcss`, `lucide-react`)

---

## 3. Configuring OpenRouter (LLM Gateway)

The only required user-provided secret is the **OpenRouter API Key**. The application does NOT require separate STT or TTS API keys because browser-native Web Speech is used.

1. Create a free account or log in at [OpenRouter.ai](https://openrouter.ai).
2. Generate an API Key under **Account Settings → Keys**.
3. In the project root directory, create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your credentials:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
   OPENROUTER_MODEL=google/gemini-2.0-flash-001
   PORT=3001
   ```
   *Note: Supported popular models include `google/gemini-2.0-flash-001`, `meta-llama/llama-3.3-70b-instruct`, `anthropic/claude-3.5-haiku`, or `openai/gpt-4o-mini`.*

> **Security Guarantee:** The `OPENROUTER_API_KEY` is loaded exclusively on the Node.js backend. It is never transmitted to the client, logged in network requests, or saved in browser localStorage.

---

## 4. Starting the Application

To run both the Express backend (port 3001) and Vite frontend (port 5173) simultaneously:
```bash
npm run dev
```

Once running:
- **Frontend Dashboard**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API**: Running on [http://localhost:3001/api/health](http://localhost:3001/api/health).

---

## 5. Testing the Connection in the UI
1. In the sidebar, navigate to the **Settings** view.
2. Under the **OpenRouter LLM Gateway** card, click **Test OpenRouter Connection**.
3. You will see real-time latency feedback and confirmation that the model is responding.
4. If the key is not yet added, the application will clearly display that the **Deterministic Fallback Engine** is active, allowing all 16+ test scenarios and dialogue qualification to still be fully exercised.

---

## 6. Running Automated Tests
To run the automated test suite (34 business rules + OpenRouter unit mocks + API integration tests):
```bash
npm run test
```
To run tests with watch mode:
```bash
npm run test:watch
```

---

## 7. Production Build
To compile TypeScript and bundle the frontend for production:
```bash
npm run build
```
To start the compiled production server:
```bash
npm run start
```
