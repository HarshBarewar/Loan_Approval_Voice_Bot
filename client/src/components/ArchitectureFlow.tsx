import React from 'react';
import { Mic, Cpu, Database, Volume2, ShieldCheck, ArrowRight, Bot } from 'lucide-react';

export const ArchitectureFlow: React.FC = () => {
  const steps = [
    {
      title: 'Voice Input',
      desc: 'Browser Web Speech STT',
      icon: Mic,
      color: 'bg-red-50 text-red-600 border-red-200'
    },
    {
      title: 'NLP & Intent Extraction',
      desc: 'Unicode-Safe Delimiters',
      icon: Cpu,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'Deterministic Rules',
      desc: 'Strict 7-Point LAP Policy',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    },
    {
      title: 'LLM Response Engine',
      desc: 'OpenRouter & Local Engine',
      icon: Bot,
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      title: 'Speech Output',
      desc: 'Browser Web Speech TTS',
      icon: Volume2,
      color: 'bg-amber-50 text-amber-600 border-amber-200'
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">System Pipeline Architecture</h3>
          <p className="text-xs text-slate-400 mt-0.5">Autonomous speech-to-speech conversational qualification loop</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Zero-Paid Audio Credential Stack
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="relative flex flex-col items-center text-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs mb-2 ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">{s.title}</span>
              <span className="text-[11px] text-slate-400 mt-0.5">{s.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
