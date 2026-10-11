import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bot,
  Mic,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  Sliders,
  Database,
  ExternalLink
} from 'lucide-react';
import * as api from '../services/api';
import { clearAllSavedConversations } from '../services/storage';

interface SettingsViewProps {
  openRouterConfigured: boolean;
  openRouterModel: string;
  sttSupported: boolean;
  ttsSupported: boolean;
  onRefreshConfig: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  openRouterConfigured,
  openRouterModel,
  sttSupported,
  ttsSupported,
  onRefreshConfig
}) => {
  // Test Connection State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model: string;
    latencyMs?: number;
    errorType?: string;
  } | null>(null);

  // Available Models State
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  // Audio preferences
  const [language, setLanguage] = useState<string>('en-IN');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoadingModels(true);
      const list = await api.getAvailableModels();
      setModels(list);
    } catch (e) {
      console.warn('Could not fetch models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await api.testLLMConnection();
      setTestResult(res);
      onRefreshConfig();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error reaching backend: ${err.message}`,
        model: openRouterModel,
        errorType: 'NETWORK_ERROR'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-red-600" />
          <h1 className="text-xl font-bold text-slate-900">System Settings & Configuration</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure the OpenRouter LLM gateway, manage browser speech parameters, and review security guidelines.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 1. OpenRouter Gateway Integration Panel                   */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">OpenRouter LLM Gateway</h2>
              <p className="text-xs text-slate-500">Live conversational intelligence and structured fact extraction.</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              openRouterConfigured
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {openRouterConfigured ? 'Key Configured' : 'Key Missing'}
          </span>
        </div>

        {/* Current Configuration Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Configured Model</span>
            <div className="font-mono font-bold text-slate-800 text-sm">{openRouterModel}</div>
            <p className="text-[11px] text-slate-500">Set via OPENROUTER_MODEL in server .env</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">API Security Status</span>
            <div className="font-semibold text-slate-800 text-sm flex items-center space-x-1.5">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span>{openRouterConfigured ? 'Secured on Backend' : 'Not Configured'}</span>
            </div>
            <p className="text-[11px] text-slate-500">API keys never exposed to browser or JavaScript</p>
          </div>
        </div>

        {/* Connection Test Action */}
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold text-xs transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing Connection...' : 'Test OpenRouter Connection'}</span>
          </button>

          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <span>Get OpenRouter API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Test Result Message Box */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="font-bold flex items-center space-x-1.5 text-sm">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{testResult.success ? 'Connection Verified' : 'Connection Failed'}</span>
              {testResult.latencyMs && (
                <span className="text-[11px] font-normal text-emerald-700">({testResult.latencyMs}ms latency)</span>
              )}
            </div>
            <p className="leading-relaxed">{testResult.message}</p>
          </div>
        )}

        {/* Setup Instructions Box */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-2">
          <span className="font-bold text-blue-950 block">How to configure OpenRouter for live chat:</span>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-blue-900">
            <li>Create an account at <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="underline font-semibold">openrouter.ai</a>.</li>
            <li>Obtain an API key from the Keys panel.</li>
            <li>Open the local file <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">.env</code> in the project directory.</li>
            <li>Set: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">OPENROUTER_API_KEY=your_key_here</code></li>
            <li>Restart the backend server and click <strong>Test OpenRouter Connection</strong>.</li>
          </ol>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Voice & Audio Settings Panel                           */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Speech & Audio Engine</h2>
            <p className="text-xs text-slate-500">Browser-native Speech Recognition (STT) and Speech Synthesis (TTS).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Speech-to-Text Support Pill */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Mic className="w-4 h-4 text-slate-600" />
                <span>Microphone (STT)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  sttSupported ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {sttSupported ? 'Supported' : 'Unsupported'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {sttSupported
                ? 'Web Speech API is available. Microphone voice recognition is active.'
                : 'Browser lacks Web Speech API. Seamless text input mode is enabled.'}
            </p>
          </div>

          {/* Speech Synthesis Support Pill */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <span>Speech Synthesis (TTS)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  ttsSupported ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {ttsSupported ? 'Supported' : 'Unsupported'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {ttsSupported
                ? 'Web Speech Synthesis is available for vocalizing assistant responses aloud.'
                : 'Browser speech synthesis unavailable.'}
            </p>
          </div>
        </div>

        {/* Speech Controls */}
        <div className="space-y-4 pt-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800 block">Default Voice Language</span>
              <span className="text-[11px] text-slate-500">Target recognition locale</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-pointer"
            >
              <option value="en-IN">English (India) — en-IN</option>
              <option value="en-US">English (US) — en-US</option>
              <option value="hi-IN">Hindi (India) — hi-IN</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800 block">Automatic Spoken Responses</span>
              <span className="text-[11px] text-slate-500">Speak every assistant response when received</span>
            </div>
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Demo Data Management                                   */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-slate-600" />
          <h2 className="font-bold text-slate-900 text-base">Local Demo Data Management</h2>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">Clear Local Conversation Cache</span>
            <span className="text-slate-500 text-[11px]">Deletes all locally stored transcripts and analytics</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Clear all local demo records?')) {
                clearAllSavedConversations();
                alert('All local conversations cleared.');
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
          >
            Clear Local Data
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Privacy & Safety Notice                                */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Security & Privacy Compliance</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          This system is an interview assignment demonstration for Home Credit. It does not store passwords, OTPs, or government identity cards. All credentials (e.g. OpenRouter API keys) reside strictly on your local backend server environment and are never transmitted to the browser.
        </p>
      </div>
    </div>
  );
};
