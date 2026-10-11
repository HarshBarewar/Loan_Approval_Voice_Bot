import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Send,
  PhoneCall,
  PhoneOff,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  HelpCircle,
  ArrowRightLeft,
  User,
  Bot
} from 'lucide-react';
import {
  ConversationState,
  ConversationStage,
  FinalOutcome,
  TranscriptMessage
} from '../types';
import * as api from '../services/api';
import { saveConversation } from '../services/storage';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface VoiceAgentViewProps {
  onConversationSaved?: () => void;
}

export const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({ onConversationSaved }) => {
  // Session State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [customerInput, setCustomerInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'hi-IN'>(() => {
    try {
      const saved = localStorage.getItem('preferred_language');
      return saved === 'hi-IN' ? 'hi-IN' : 'en-IN';
    } catch {
      return 'en-IN';
    }
  });

  // Audio Hooks
  const speechSynth = useSpeechSynthesis(1.0, false, selectedLanguage);
  const speechRec = useSpeechRecognition({
    lang: selectedLanguage,
    onResult: (text) => {
      // Put recognized speech into input preview for user review / editing
      setCustomerInput(text);
    },
    onError: (err) => {
      setErrorBanner(err);
    }
  });

  const handleLanguageChange = (newLang: 'en-IN' | 'hi-IN') => {
    setSelectedLanguage(newLang);
    try {
      localStorage.setItem('preferred_language', newLang);
    } catch {
      // ignore
    }
    speechRec.setLang(newLang);
    speechSynth.setLanguage(newLang);
    if (state) {
      setState({ ...state, language: newLang });
    }
  };

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Sync speech recognition error message to user banner
  useEffect(() => {
    if (speechRec.errorMessage) {
      setErrorBanner(speechRec.errorMessage);
    }
  }, [speechRec.errorMessage]);

  // Call Duration Timer
  useEffect(() => {
    let interval: any;
    if (conversationId && state?.finalOutcome === null) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [conversationId, state?.finalOutcome]);

  // Scroll to bottom on new message
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, speechRec.interimTranscript]);

  // Start New Call
  const handleStartCall = async () => {
    try {
      setIsProcessing(true);
      setErrorBanner(null);
      speechSynth.stop();
      speechRec.stopListening();

      const customerName = selectedLanguage === 'hi-IN' ? 'श्री शर्मा' : 'Mr. Sharma';
      const agentName = selectedLanguage === 'hi-IN' ? 'प्रिया (होम क्रेडिट)' : 'Priya (Home Credit)';
      const session = await api.createConversation(customerName, agentName, selectedLanguage);
      setConversationId(session.conversationId);
      setState(session.state);
      setTranscript(session.transcript);
      setCallDuration(0);
      setCustomerInput('');

      // Vocalize initial greeting if synthesis enabled
      if (!speechSynth.isMuted) {
        speechSynth.speak(session.initialMessage, selectedLanguage);
      }
    } catch (err: any) {
      setErrorBanner(`Failed to start conversation: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // End Call
  const handleEndCall = async () => {
    if (!conversationId) return;
    speechSynth.stop();
    speechRec.stopListening();
    try {
      setIsProcessing(true);
      const res = await api.endConversation(conversationId);
      setState(res.state);
      setTranscript(res.transcript);

      // Save to local storage
      saveConversation(
        conversationId,
        res.state.customerName,
        res.state,
        res.transcript,
        callDuration
      );
      if (onConversationSaved) onConversationSaved();
    } catch (err: any) {
      setErrorBanner(`Failed to end call: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Send Message (via text or speech recognition)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || customerInput).trim();
    if (!text || !conversationId || isProcessing) return;

    speechRec.stopListening();
    speechSynth.stop();
    setIsProcessing(true);
    setErrorBanner(null);

    // Optimistically show user message
    const tempCustomerMsg: TranscriptMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      sender: 'customer',
      text,
      timestamp: new Date().toISOString(),
      stageAtTurn: state?.stage || ConversationStage.GREETING
    };
    setTranscript((prev) => [...prev, tempCustomerMsg]);
    setCustomerInput('');
    speechRec.resetTranscript();

    try {
      const response = await api.sendMessage(conversationId, text, false, selectedLanguage);

      setState(response.state || {
        ...state!,
        stage: response.stage,
        checklist: response.checklist,
        overallEligibility: response.overallEligibility,
        finalOutcome: response.finalOutcome,
        routingReason: response.routingReason,
        disqualificationReason: response.disqualificationReason,
        nextMissingQuestion: response.nextMissingQuestion,
        turnCount: response.turnCount
      });

      setTranscript(response.transcript);

      // Vocalize response aloud if TTS enabled
      if (!speechSynth.isMuted && response.assistantResponse) {
        speechSynth.speak(response.assistantResponse, selectedLanguage);
      }

      // Save updated state in localStorage
      if (response.state) {
        saveConversation(
          conversationId,
          response.state.customerName,
          response.state,
          response.transcript,
          callDuration
        );
        if (onConversationSaved) onConversationSaved();
      }
    } catch (err: any) {
      setErrorBanner(`Error processing response: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (speechRec.isListening) {
      speechRec.stopListening();
      if (customerInput.trim()) {
        handleSendMessage(customerInput.trim());
      }
    } else {
      let activeId = conversationId;
      if (!activeId) {
        try {
          setIsProcessing(true);
          setErrorBanner(null);
          speechSynth.stop();
          const session = await api.createConversation('Mr. Sharma', 'Priya (Home Credit)');
          setConversationId(session.conversationId);
          activeId = session.conversationId;
          setState(session.state);
          setTranscript(session.transcript);
          setCallDuration(0);
          setCustomerInput('');
          setIsProcessing(false);
        } catch (e: any) {
          setErrorBanner(`Failed to start call: ${e.message}`);
          setIsProcessing(false);
          return;
        }
      }
      speechSynth.stop();
      await speechRec.startListening();
    }
  };

  const isCallActive = conversationId !== null && state?.finalOutcome === null;

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {errorBanner && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Conversation & Voice Controls (7 cols)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[750px] overflow-hidden">
          {/* Call Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 font-bold">
                  HC
                </div>
                {isCallActive && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800 text-sm">Priya — Home Credit LAP Agent</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                    {state?.stage ? state.stage.replace(/_/g, ' ') : 'IDLE'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                  <span>Call status:</span>
                  <span className="font-semibold text-slate-700">
                    {speechRec.isListening
                      ? 'Listening to customer...'
                      : speechSynth.isSpeaking
                      ? 'Agent speaking aloud...'
                      : isProcessing
                      ? 'Processing answer...'
                      : isCallActive
                      ? 'Active call'
                      : 'Idle'}
                  </span>
                  {isCallActive && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-600">
                        {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Call Control & Language Buttons */}
            <div className="flex items-center space-x-2">
              {/* Language Selection: English / हिन्दी */}
              <div className="flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en-IN')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedLanguage === 'en-IN'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Converse and listen in English"
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi-IN')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                    selectedLanguage === 'hi-IN'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Converse and listen in Hindi (हिंदी भाषा)"
                >
                  <span>🇮🇳 हिन्दी</span>
                </button>
              </div>

              {!isCallActive ? (
                <button
                  onClick={handleStartCall}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Start Call</span>
                </button>
              ) : (
                <button
                  onClick={handleEndCall}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <PhoneCall className="w-8 h-8 stroke-1" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-sm">No Active Conversation</h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Click "Start Call" or tap the microphone below to begin the Loan Against Property qualification call.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {transcript.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-2">
                        <span className="text-[11px] bg-slate-200/80 text-slate-600 px-3 py-1 rounded-full">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start space-x-3 ${isAgent ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAgent && (
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          HC
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-2xs text-sm leading-relaxed ${
                          isAgent
                            ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                            : 'bg-blue-600 text-white rounded-tr-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between space-x-4 mb-1">
                          <span className={`text-[11px] font-semibold ${isAgent ? 'text-red-700' : 'text-blue-100'}`}>
                            {isAgent ? 'Priya (Home Credit)' : 'Customer (You)'}
                          </span>
                          <span className={`text-[10px] ${isAgent ? 'text-slate-400' : 'text-blue-200'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      {!isAgent && (
                        <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-2xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Live Speech Recognition Interim Preview Bubble */}
                {speechRec.interimTranscript && (
                  <div className="flex items-start justify-end space-x-3 opacity-75">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-tr-xs text-sm italic">
                      <div className="text-[11px] font-semibold text-blue-700 mb-1 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping inline-block mr-1" />
                        Listening...
                      </div>
                      "{speechRec.interimTranscript}"
                    </div>
                  </div>
                )}

                {/* Processing Indicator Bubble */}
                {isProcessing && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      HC
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-2xs text-xs text-slate-500 flex items-center space-x-2">
                      <span className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                      </span>
                      <span>Evaluating business rules & OpenRouter...</span>
                    </div>
                  </div>
                )}

                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          {/* Audio Controls Bar */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center space-x-2">
              {/* Voice Mute Toggle */}
              <button
                onClick={() => speechSynth.setIsMuted(!speechSynth.isMuted)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  speechSynth.isMuted
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={speechSynth.isMuted ? 'Voice is Muted. Click to Unmute' : 'Voice is Active. Click to Mute'}
              >
                {speechSynth.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Replay Last Response */}
              <button
                onClick={speechSynth.replay}
                disabled={transcript.length === 0 || speechSynth.isMuted}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                title="Replay last agent response"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Stop Speaking */}
              {speechSynth.isSpeaking && (
                <button
                  onClick={speechSynth.stop}
                  className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-medium flex items-center space-x-1 cursor-pointer"
                  title="Stop speaking"
                >
                  <Square className="w-3 h-3 fill-rose-600" />
                  <span>Stop Speech</span>
                </button>
              )}
            </div>

            {/* Voice & Speech Rate Selectors */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500">Speed:</span>
                <select
                  value={speechSynth.rate}
                  onChange={(e) => speechSynth.setRate(parseFloat(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 cursor-pointer"
                >
                  <option value={0.85}>0.85x</option>
                  <option value={1.0}>1.0x (Normal)</option>
                  <option value={1.15}>1.15x</option>
                  <option value={1.3}>1.3x</option>
                </select>
              </div>

              {speechSynth.voices.length > 0 && (
                <div className="hidden sm:flex items-center space-x-1">
                  <span className="text-[11px] text-slate-500">Voice:</span>
                  <select
                    value={speechSynth.selectedVoice?.voiceURI || ''}
                    onChange={(e) => {
                      const v = speechSynth.voices.find(voice => voice.voiceURI === e.target.value);
                      if (v) speechSynth.setSelectedVoice(v);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 max-w-[130px] truncate cursor-pointer"
                  >
                    {speechSynth.voices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name.replace(/Microsoft |Google /i, '')} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* User Input & Microphone Trigger Area */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-2">
            {/* Active Listening Indicator with Audio Level Meter */}
            {speechRec.isListening && (
              <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between shadow-xs gap-2">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                  </span>
                  <span className="font-semibold text-red-800">
                    Listening to your voice... Speak now!
                  </span>
                  {speechRec.audioLevel > 0 && (
                    <div className="flex items-center space-x-1 ml-2">
                      <span className="text-[10px] text-red-600 font-mono">Mic:</span>
                      <div className="w-14 bg-red-200 h-2 rounded-full overflow-hidden inline-block">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all duration-75"
                          style={{ width: `${Math.min(100, Math.max(10, speechRec.audioLevel * 1.5))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {customerInput.trim() && (
                    <button
                      onClick={() => {
                        speechRec.stopListening();
                        handleSendMessage(customerInput.trim());
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 shadow-2xs cursor-pointer"
                    >
                      Done & Send
                    </button>
                  )}
                  <button
                    onClick={() => speechRec.stopListening()}
                    className="text-red-700 hover:text-red-900 font-semibold text-xs px-2 py-1 cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* Live speech preview if recognized and pending send */}
            {speechRec.transcript && !speechRec.isListening && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2 flex items-center justify-between">
                <span>Recognized: <strong>"{speechRec.transcript}"</strong></span>
                <span className="text-[10px] text-emerald-600 font-semibold">Ready to send</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              {/* Prominent Microphone Button */}
              <button
                onClick={handleToggleMic}
                disabled={isProcessing}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md active:scale-95 cursor-pointer ${
                  speechRec.isListening
                    ? 'bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                    : speechRec.isSupported
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
                title={
                  !speechRec.isSupported
                    ? 'Native speech recognition not supported in this browser; click to read instructions or use text input.'
                    : speechRec.isListening
                    ? 'Click to stop listening'
                    : 'Click to speak via microphone'
                }
              >
                {speechRec.isListening ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Editable Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customerInput}
                  onChange={(e) => setCustomerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    speechRec.isListening
                      ? selectedLanguage === 'hi-IN'
                        ? 'आपकी आवाज़ सुन रहे हैं... (या यहाँ टाइप करें)'
                        : 'Listening to speech... (or type answer here)'
                      : isCallActive
                      ? selectedLanguage === 'hi-IN'
                        ? 'माइक दबाकर बोलें या उत्तर टाइप करें...'
                        : 'Type your answer or click mic to speak...'
                      : selectedLanguage === 'hi-IN'
                        ? 'कॉल शुरू करें (Start Call) बातचीत के लिए...'
                        : 'Start call to begin answering...'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all pr-12"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!customerInput.trim() || isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shadow-2xs cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Test Utterances Bar (Localized for active language) */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mr-1">
                {selectedLanguage === 'hi-IN' ? 'त्वरित उत्तर:' : 'Quick Prompts:'}
              </span>
              {selectedLanguage === 'hi-IN' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('आवासीय संपत्ति है, मुझे 50 लाख का लोन चाहिए'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    आवासीय, ₹50L लोन
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('मूल दस्तावेज़ घर पर उपलब्ध हैं'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    मूल दस्तावेज़ उपलब्ध हैं
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('नहीं, मूल दस्तावेज़ उपलब्ध नहीं हैं'); }}
                    className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    title="Disqualification test for missing original documents"
                  >
                    दस्तावेज़ नहीं हैं (Nahi)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('नौकरीपेशा हूँ, वेतन बैंक खाते में आता है'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    नौकरी, बैंक वेतन
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('संपत्ति का मूल्य 1 करोड़ है और 10 साल की अवधि चाहिए'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    मूल्य ₹1Cr, 10 साल
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('यह खेती की ज़मीन है'); }}
                    className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    title="Disqualification check"
                  >
                    खेती की ज़मीन
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('इस प्रॉपर्टी पर पहले से होम लोन चल रहा है'); }}
                    className="px-2 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                    title="Specialist balance transfer check"
                  >
                    पहले से लोन है
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('Residential property, I need 50 lakhs loan'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Residential, ₹50L
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('Yes, original deeds are available at home'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Original docs available
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('No, original documents are not available'); }}
                    className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    title="Disqualification test for missing original documents"
                  >
                    No original docs
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('Salaried employee, income is in bank account'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Salaried, Bank income
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('Market value is 1 crore, tenure 10 years'); }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Value ₹1Cr, 10 yrs
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('It is agricultural farmland'); }}
                    className="px-2 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                    title="Disqualification test"
                  >
                    Agricultural farm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerInput('I already have an existing mortgage loan on this property'); }}
                    className="px-2 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                    title="Specialist balance transfer test"
                  >
                    Existing mortgage
                  </button>
                </>
              )}
            </div>

            {/* Recognition Fallback Info Note */}
            {!speechRec.isSupported && (
              <p className="text-[11px] text-amber-700 text-center">
                Speech recognition is not natively available in this browser. You can type answers and hear speech output via synthesis.
              </p>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Qualification State & Checklist (5 cols)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Overall Preliminary Eligibility Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Qualification Status</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                  state?.overallEligibility === 'ELIGIBLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : state?.overallEligibility === 'DISQUALIFIED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : state?.overallEligibility === 'SPECIALIST_TRANSFER'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {state?.overallEligibility || 'PENDING'}
              </span>
            </div>

            {/* Final Outcome Banner */}
            {state?.finalOutcome && (
              <div
                className={`p-4 rounded-xl border text-sm space-y-2 ${
                  state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : state.finalOutcome === FinalOutcome.DISQUALIFIED
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : state.finalOutcome === FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED
                    ? 'bg-purple-50 border-purple-200 text-purple-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-base">
                  {state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : state.finalOutcome === FinalOutcome.DISQUALIFIED ? (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                  )}
                  <span>{state.finalOutcome.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {state.routingReason || state.disqualificationReason || 'Conversation outcome reached.'}
                </p>
              </div>
            )}

            {/* Next Missing Question */}
            {state?.nextMissingQuestion && !state.finalOutcome && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                <span className="font-semibold block text-blue-800 mb-1 flex items-center space-x-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Next Missing Question:</span>
                </span>
                <p>{state.nextMissingQuestion}</p>
              </div>
            )}

            {/* Quick Context Flags */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Customer Availability</span>
                <span className="font-semibold text-slate-800">
                  {state?.isCustomerAvailable ? 'Available' : `Busy (${state?.callbackTime || 'Later'})`}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Existing Mortgage Loan</span>
                <span className="font-semibold text-slate-800">
                  {state?.existingPropertyLoan ? 'Detected (Specialist)' : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* The 7 Eligibility Checklist Items */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>The 7 LAP Eligibility Criteria</span>
              </h3>
              <span className="text-xs text-slate-400">Strict Enforcement</span>
            </div>

            <div className="space-y-3">
              {/* 1. Property Type */}
              <ChecklistItem
                index={1}
                label="Property Type"
                value={state?.checklist.propertyType.value || null}
                status={state?.checklist.propertyType.status || 'UNKNOWN'}
                ruleDescription="Residential, Commercial, Industrial. (Agricultural is disqualified)"
              />

              {/* 2. Ownership Status */}
              <ChecklistItem
                index={2}
                label="Ownership Status"
                value={state?.checklist.ownershipStatus.value || null}
                status={state?.checklist.ownershipStatus.status || 'UNKNOWN'}
                ruleDescription="Sole ownership and Joint ownership are both eligible"
              />

              {/* 3. Original Documents */}
              <ChecklistItem
                index={3}
                label="Original Property Documents"
                value={
                  state?.checklist.originalDocuments.value !== null && state?.checklist.originalDocuments.value !== undefined
                    ? state.checklist.originalDocuments.value
                      ? 'Originals Available'
                      : 'Only Copies (Failed)'
                    : null
                }
                status={state?.checklist.originalDocuments.status || 'UNKNOWN'}
                ruleDescription="Original title deeds mandatory for physical verification"
              />

              {/* 4. Desired Loan Amount */}
              <ChecklistItem
                index={4}
                label="Desired Loan Amount"
                value={
                  state?.checklist.desiredLoanAmount.value
                    ? `₹${state.checklist.desiredLoanAmount.value.toLocaleString('en-IN')}`
                    : null
                }
                status={state?.checklist.desiredLoanAmount.status || 'UNKNOWN'}
                ruleDescription="Maximum cap ₹75,00,000 (₹75 Lakhs)"
              />

              {/* 5. Occupation & Income Mode */}
              <ChecklistItem
                index={5}
                label="Occupation & Income Mode"
                value={
                  state?.checklist.occupation.value || state?.checklist.incomeMode.value
                    ? `${state.checklist.occupation.value || ''} • Mode: ${state.checklist.incomeMode.value || ''}`
                    : null
                }
                status={
                  state?.checklist.incomeMode.status === 'FAILED'
                    ? 'FAILED'
                    : state?.checklist.occupation.status !== 'UNKNOWN' && state?.checklist.incomeMode.status !== 'UNKNOWN'
                    ? 'CAPTURED'
                    : 'UNKNOWN'
                }
                ruleDescription="Salaried / Self-employed. Income must be via Bank (Cash fails)"
              />

              {/* 6. Property Market Value */}
              <ChecklistItem
                index={6}
                label="Property Market Value"
                value={
                  state?.checklist.marketValue.value
                    ? `₹${state.checklist.marketValue.value.toLocaleString('en-IN')} (Est)`
                    : null
                }
                status={state?.checklist.marketValue.status || 'UNKNOWN'}
                ruleDescription="Estimated market value (No arbitrary minimum threshold)"
              />

              {/* 7. Desired Tenure */}
              <ChecklistItem
                index={7}
                label="Repayment Tenure"
                value={
                  state?.checklist.desiredTenureYears.value
                    ? `${state.checklist.desiredTenureYears.value} Years`
                    : null
                }
                status={state?.checklist.desiredTenureYears.status || 'UNKNOWN'}
                ruleDescription="Must be between 3 and 15 years inclusive"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChecklistItemProps {
  index: number;
  label: string;
  value: string | null;
  status: string;
  ruleDescription: string;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  index,
  label,
  value,
  status,
  ruleDescription
}) => {
  const isConfirmed = status === 'CONFIRMED' || status === 'CAPTURED';
  const isFailed = status === 'FAILED';

  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 w-4">{index}.</span>
            <span className="text-xs font-semibold text-slate-800">{label}</span>
          </div>
          <p className="text-[11px] text-slate-400 pl-5">{ruleDescription}</p>
        </div>

        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            isFailed
              ? 'bg-rose-100 text-rose-800 border border-rose-200'
              : isConfirmed
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-2 pl-5 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">
          {value ? value : <span className="text-slate-400 italic">Not yet captured</span>}
        </span>
      </div>
    </div>
  );
};
