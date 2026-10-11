# Browser Speech Support & Capabilities Note

## 1. Speech-to-Text (STT): Web Speech API
Voice input is implemented using the browser's native `SpeechRecognition` / `webkitSpeechRecognition` interface.

### Compatibility Table
| Browser | OS | Support Status | Notes |
|---------|----|----------------|-------|
| Google Chrome | Windows / macOS / Android | **Full Native Support** | Interim & final results supported |
| Microsoft Edge | Windows / macOS | **Full Native Support** | Interim & final results supported |
| Brave Browser | Windows / macOS | **Supported** | Enable speech services if prompted |
| Apple Safari | macOS / iOS | **Partial** | Final results supported; interim varies |
| Mozilla Firefox | All | **Not Supported Natively** | Web Speech STT disabled by default in Firefox |

### Graceful Fallback
When speech recognition is unsupported or if microphone access is denied by the user:
- The interface automatically displays an informative banner: *"Speech recognition not supported in this browser; manual text input is active."*
- Full text-based conversational qualification remains 100% operational.
- Assistant audio vocalization via Speech Synthesis continues to work normally.

---

## 2. Text-to-Speech (TTS): Speech Synthesis API
Spoken responses are generated via `window.speechSynthesis` and `SpeechSynthesisUtterance`.

### Compatibility Table
| Browser | Support Status | Notes |
|---------|----------------|-------|
| Google Chrome | **Supported** | High quality natural voices |
| Microsoft Edge | **Supported** | Natural Microsoft online & offline voices |
| Apple Safari | **Supported** | Apple Siri & system voices |
| Mozilla Firefox | **Supported** | OS voices |

### Voice & Rate Configuration
- **Voice Selection**: Automatically detects and prioritizes Indian English voices (`en-IN`), followed by English (`en-US`/`en-GB`) and Hindi (`hi-IN`).
- **Speech Rate**: User-configurable from 0.85x to 1.3x.
- **Audio Controls**: Mute toggle, Stop Speaking button, and Replay Last Response button are always accessible.
