import React from 'react';
import {
  Mic,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Clock,
  Play,
  Bot,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { SavedConversation } from '../types';

interface OverviewViewProps {
  conversations: SavedConversation[];
  openRouterConfigured: boolean;
  openRouterModel: string;
  sttSupported: boolean;
  ttsSupported: boolean;
  onStartCall: () => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  conversations,
  openRouterConfigured,
  openRouterModel,
  sttSupported,
  ttsSupported,
  onStartCall,
  onNavigateTab
}) => {
  // Aggregate Local Statistics
  const totalConversations = conversations.length;
  const eligibleCount = conversations.filter(c => c.state.finalOutcome === 'QUALIFIED_FOR_HUMAN_HANDOFF').length;
  const disqualifiedCount = conversations.filter(c => c.state.finalOutcome === 'DISQUALIFIED').length;
  const transferCount = conversations.filter(c => c.state.finalOutcome === 'LOAN_TRANSFER_SPECIALIST_REQUIRED').length;
  const avgDuration = totalConversations > 0
    ? Math.round(conversations.reduce((acc, c) => acc + (c.durationSeconds || 0), 0) / totalConversations)
    : 0;

  return (
    <div className="space-y-6">
      {/* Simulation Banner Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">Assignment Simulation Environment:</span> This application simulates an AI voice-qualification call for the Home Credit Loan Against Property (LAP) pre-approval campaign. It does not contact real telephone customers, access live bank databases, or issue actual final loan sanctions.
        </div>
      </div>

      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-semibold uppercase tracking-wider">
            <span>Home Credit India</span>
            <span>•</span>
            <span>LAP Voicebot 2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Home Credit AI Voice Agent
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Autonomous voice qualification pipeline for Loan Against Property (up to ₹75 Lakhs). Evaluates 7 core criteria, recognizes Indian English speech and numbers, detects balance transfers, and routes ineligible cases immediately.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartCall}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Voice Agent</span>
            </button>
            <button
              onClick={() => onNavigateTab('scenarios')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer"
            >
              <span>View 16+ Test Scenarios</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* System Status Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OpenRouter Gateway Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LLM Engine</span>
            <Bot className={`w-4 h-4 ${openRouterConfigured ? 'text-emerald-600' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${openRouterConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="font-semibold text-slate-800 text-sm">
              {openRouterConfigured ? 'OpenRouter Connected' : 'Local Fallback Engine'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {openRouterConfigured ? openRouterModel : 'Set OPENROUTER_API_KEY in .env for live LLM'}
          </p>
        </div>

        {/* Speech-to-Text Support */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Speech-to-Text (STT)</span>
            <Mic className={`w-4 h-4 ${sttSupported ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${sttSupported ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="font-semibold text-slate-800 text-sm">
              {sttSupported ? 'Web Speech API Available' : 'Manual Text Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {sttSupported ? 'Microphone voice recognition ready' : 'Browser lacks native speech recognition'}
          </p>
        </div>

        {/* Speech Synthesis Support */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Speech Synthesis (TTS)</span>
            <ShieldCheck className={`w-4 h-4 ${ttsSupported ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${ttsSupported ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className="font-semibold text-slate-800 text-sm">
              {ttsSupported ? 'Audio Playback Active' : 'Silent Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {ttsSupported ? 'Browser voice synthesizer loaded' : 'Voice synthesis unavailable'}
          </p>
        </div>
      </div>

      {/* Aggregate Local Test Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">Test Conversations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalConversations}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Local browser session</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pre-Qualified</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{eligibleCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Met all 7 checklist rules</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-rose-700 font-medium flex items-center space-x-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Disqualified</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{disqualifiedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Failed policy criteria</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-xs text-purple-700 font-medium flex items-center space-x-1">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Cases</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{transferCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Existing loan / EMI reduce</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500 font-medium flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Avg Duration</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{avgDuration}s</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Per conversation</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Test Conversations</h2>
            <p className="text-xs text-slate-500">History of conversations executed in this demo instance.</p>
          </div>
          {conversations.length > 0 && (
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
            >
              <span>View all ({conversations.length})</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <Mic className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium text-slate-600">No test conversations recorded yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start a new voice conversation or run automated test scenarios to populate local analytics.
            </p>
            <button
              onClick={onStartCall}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start First Conversation</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {conversations.slice(0, 5).map((conv) => (
              <div key={conv.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800 text-sm">{conv.customerName}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{new Date(conv.savedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">
                    {conv.transcript[conv.transcript.length - 1]?.text || 'No messages'}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      conv.state.finalOutcome === 'QUALIFIED_FOR_HUMAN_HANDOFF'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : conv.state.finalOutcome === 'DISQUALIFIED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : conv.state.finalOutcome === 'LOAN_TRANSFER_SPECIALIST_REQUIRED'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {conv.state.finalOutcome ? conv.state.finalOutcome.replace(/_/g, ' ') : 'IN PROGRESS'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
