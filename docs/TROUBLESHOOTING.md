# Troubleshooting Guide — Home Credit AI Voice Agent

## 1. OpenRouter & LLM Connection Issues

### Issue: "OpenRouter API Key is not configured"
- **Cause**: The `.env` file does not exist, or `OPENROUTER_API_KEY` is empty.
- **Fix**: Create `.env` in the project root with `OPENROUTER_API_KEY=your_key`. Make sure to restart the backend (`npm run dev`) after modifying `.env`.

### Issue: "Authentication failed (401)"
- **Cause**: The API key is invalid, revoked, or has a leading/trailing typo.
- **Fix**: Re-generate an API key at [openrouter.ai/keys](https://openrouter.ai/keys) and paste it into `.env`.

### Issue: "Insufficient credits or quota (402)"
- **Cause**: Your OpenRouter account balance is zero or has reached its credit limit.
- **Fix**: Top up credits on OpenRouter, or switch to a free-tier verified model, or test with the built-in deterministic fallback engine (which uses 0 credits).

### Issue: "Model not found (404)"
- **Cause**: The model identifier specified in `OPENROUTER_MODEL` is deprecated or unavailable.
- **Fix**: Set `OPENROUTER_MODEL=google/gemini-2.0-flash-001` or `meta-llama/llama-3.3-70b-instruct` in `.env`.

---

## 2. Voice & Audio Issues

### Issue: "Microphone permission denied"
- **Cause**: The browser blocked microphone access for `localhost:5173`.
- **Fix**:
  1. Click the lock/site settings icon in your browser's address bar.
  2. Set **Microphone** to **Allow**.
  3. Refresh the page and click the mic icon again.

### Issue: "Speech recognition not supported in this browser"
- **Cause**: Firefox, older Safari, or Linux Chromium builds may lack native Web Speech Recognition.
- **Fix**: Google Chrome, Microsoft Edge, or Brave provide native Web Speech API support. Alternatively, manual text input is always active and provides identical conversational processing and speech synthesis playback.

### Issue: "No sound / Assistant response not speaking aloud"
- **Cause**:
  1. Speech output is muted in the UI (indicated by the muted speaker icon). Click the speaker icon to unmute.
  2. The browser requires user interaction before playing audio (browser auto-play policy). Click "Start Call" or any UI button first.
  3. Check system volume.

---

## 3. Port & Process Issues

### Issue: "Port 3001 already in use"
- **Cause**: Another service or previous server process is running on port 3001.
- **Fix**:
  - In PowerShell:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
    ```
  - Or specify an alternative port in `.env`: `PORT=3002`.

### Issue: "Vite proxy error ECONNREFUSED"
- **Cause**: Frontend is running, but the backend server is not running on port 3001.
- **Fix**: Ensure both are running via `npm run dev` at the root directory.
