import React from 'react';
import { ShieldAlert, Bot, Mic, Volume2 } from 'lucide-react';

interface NavbarProps {
  openRouterConfigured: boolean;
  openRouterModel: string;
  sttSupported: boolean;
  ttsSupported: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  openRouterConfigured,
  openRouterModel,
  sttSupported,
  ttsSupported
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 text-white font-extrabold text-xl shadow-sm tracking-tighter">
              HC
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  Home Credit
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                  LAP Voice Agent
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Loan Against Property Qualification Engine (Assignment Simulation)
              </p>
            </div>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Simulation Warning Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulation Demo</span>
            </div>

            {/* OpenRouter Gateway Badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                openRouterConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={openRouterConfigured ? `OpenRouter Active: ${openRouterModel}` : 'OpenRouter API Key not set; local deterministic fallback engine is active.'}
            >
              <Bot className={`w-3.5 h-3.5 ${openRouterConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="hidden sm:inline">OpenRouter:</span>
              <span className="font-semibold truncate max-w-[120px]">
                {openRouterConfigured ? openRouterModel.split('/').pop() : 'Local Engine'}
              </span>
            </div>

            {/* Browser Audio Indicators */}
            <div className="flex items-center space-x-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-xs text-slate-600">
              <span title={sttSupported ? 'Web Speech STT: Supported' : 'Speech recognition unavailable, text input enabled'}>
                <Mic className={`w-3.5 h-3.5 ${sttSupported ? 'text-emerald-600' : 'text-slate-400'}`} />
              </span>
              <span className="text-slate-300">/</span>
              <span title={ttsSupported ? 'Web Speech TTS: Supported' : 'Speech synthesis unavailable'}>
                <Volume2 className={`w-3.5 h-3.5 ${ttsSupported ? 'text-emerald-600' : 'text-slate-400'}`} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
