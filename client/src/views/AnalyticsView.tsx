import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Clock,
  PieChart,
  HelpCircle,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { SavedConversation } from '../types';

interface AnalyticsViewProps {
  conversations: SavedConversation[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ conversations }) => {
  const total = conversations.length;
  const eligible = conversations.filter(c => c.state.finalOutcome === 'QUALIFIED_FOR_HUMAN_HANDOFF').length;
  const disqualified = conversations.filter(c => c.state.finalOutcome === 'DISQUALIFIED').length;
  const transfer = conversations.filter(c => c.state.finalOutcome === 'LOAN_TRANSFER_SPECIALIST_REQUIRED').length;
  const callback = conversations.filter(c => c.state.finalOutcome === 'CALLBACK_REQUESTED').length;
  const declined = conversations.filter(c => c.state.finalOutcome === 'DECLINED').length;
  const incomplete = conversations.filter(c => c.state.finalOutcome === 'INCOMPLETE' || c.state.finalOutcome === null).length;

  const eligibleRate = total > 0 ? Math.round((eligible / total) * 100) : 0;
  const disqualifiedRate = total > 0 ? Math.round((disqualified / total) * 100) : 0;
  const transferRate = total > 0 ? Math.round((transfer / total) * 100) : 0;
  const callbackRate = total > 0 ? Math.round((callback / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-red-600" />
          <h1 className="text-xl font-bold text-slate-900">Conversational Qualification Analytics</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Real-time metrics calculated exclusively from local browser test conversations. No fabricated data.
        </p>
      </div>

      {total === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-2xs">
          <PieChart className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">No Local Analytics Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Metrics are generated from actual voice conversations and automated scenario executions. Conduct qualification calls to view distribution charts.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-xs text-slate-400 font-semibold uppercase">Total Runs</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{total}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Local test sessions</span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-2xs bg-emerald-50/20">
              <span className="text-xs text-emerald-700 font-semibold uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Qualification Rate</span>
              </span>
              <div className="text-3xl font-extrabold text-emerald-700 mt-1">{eligibleRate}%</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">{eligible} qualified customers</span>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-2xs bg-rose-50/20">
              <span className="text-xs text-rose-700 font-semibold uppercase flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Disqualification Rate</span>
              </span>
              <div className="text-3xl font-extrabold text-rose-700 mt-1">{disqualifiedRate}%</div>
              <span className="text-[11px] text-rose-600 mt-1 block">{disqualified} criteria failures</span>
            </div>

            <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-2xs bg-purple-50/20">
              <span className="text-xs text-purple-700 font-semibold uppercase flex items-center space-x-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer Specialist</span>
              </span>
              <div className="text-3xl font-extrabold text-purple-700 mt-1">{transferRate}%</div>
              <span className="text-[11px] text-purple-600 mt-1 block">{transfer} balance transfers</span>
            </div>
          </div>

          {/* Outcome Breakdown Bars */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Outcome Distribution Breakdown
            </h2>

            <div className="space-y-4 text-xs">
              {/* Qualified */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Qualified for Human Handoff</span>
                  <span className="text-slate-500 font-mono">{eligible} ({eligibleRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${eligibleRate}%` }} />
                </div>
              </div>

              {/* Disqualified */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Disqualified (Policy Ineligible)</span>
                  <span className="text-slate-500 font-mono">{disqualified} ({disqualifiedRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-rose-500 h-3 rounded-full transition-all" style={{ width: `${disqualifiedRate}%` }} />
                </div>
              </div>

              {/* Loan Transfer Specialist */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Loan Transfer Specialist Required</span>
                  <span className="text-slate-500 font-mono">{transfer} ({transferRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-purple-500 h-3 rounded-full transition-all" style={{ width: `${transferRate}%` }} />
                </div>
              </div>

              {/* Callback Requested */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Callback Requested (Busy)</span>
                  <span className="text-slate-500 font-mono">{callback} ({callbackRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${callbackRate}%` }} />
                </div>
              </div>

              {/* Declined / Incomplete */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Declined / Incomplete Calls</span>
                  <span className="text-slate-500 font-mono">{declined + incomplete}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-slate-400 h-3 rounded-full transition-all"
                    style={{ width: `${Math.round(((declined + incomplete) / total) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
