import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  FileText,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { SavedConversation } from '../types';
import {
  deleteSavedConversation,
  clearAllSavedConversations,
  exportConversationAsJSON,
  exportTranscriptAsText
} from '../services/storage';

interface HistoryViewProps {
  conversations: SavedConversation[];
  onRefresh: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ conversations, onRefresh }) => {
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [selectedConv, setSelectedConv] = useState<SavedConversation | null>(null);

  const filtered = conversations.filter(c => {
    if (filterOutcome === 'ALL') return true;
    return c.state.finalOutcome === filterOutcome;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation record?')) {
      deleteSavedConversation(id);
      if (selectedConv?.id === id) setSelectedConv(null);
      onRefresh();
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all local conversation records? This action cannot be undone.')) {
      clearAllSavedConversations();
      setSelectedConv(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Conversation History</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Local browser demo history. Inspect transcripts, audit captured eligibility fields, and export records as JSON or text.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Records</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold uppercase text-[10px] pl-1">Filter:</span>
        {['ALL', 'QUALIFIED_FOR_HUMAN_HANDOFF', 'DISQUALIFIED', 'LOAN_TRANSFER_SPECIALIST_REQUIRED', 'CALLBACK_REQUESTED', 'DECLINED', 'INCOMPLETE'].map(outcome => (
          <button
            key={outcome}
            onClick={() => setFilterOutcome(outcome)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filterOutcome === outcome
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {outcome === 'ALL' ? 'All Records' : outcome.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* List and Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Conversations List (5 cols or full) */}
        <div className={`${selectedConv ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3 shadow-2xs">
              <History className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <h3 className="font-bold text-slate-700 text-sm">No Conversations Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {conversations.length === 0
                  ? 'Run a conversation in the Voice Agent workspace or execute test scenarios to generate history.'
                  : 'No conversations match the selected outcome filter.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedConv?.id === item.id;
              const outcome = item.state.finalOutcome;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedConv(item)}
                  className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-slate-300 ${
                    isSelected ? 'ring-2 ring-red-500 border-red-500' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 text-sm">{item.customerName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {new Date(item.savedAt).toLocaleDateString()} {new Date(item.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-2 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.durationSeconds || 0}s duration</span>
                        </span>
                        <span>•</span>
                        <span>{item.transcript.length} messages</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          outcome === 'QUALIFIED_FOR_HUMAN_HANDOFF'
                            ? 'bg-emerald-100 text-emerald-800'
                            : outcome === 'DISQUALIFIED'
                            ? 'bg-rose-100 text-rose-800'
                            : outcome === 'LOAN_TRANSFER_SPECIALIST_REQUIRED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {outcome ? outcome.replace(/_/g, ' ') : 'INCOMPLETE'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <span className="text-slate-500 truncate max-w-[200px]">
                      ID: <span className="font-mono text-slate-700">{item.id.substring(0, 15)}...</span>
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportConversationAsJSON(item);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        title="Export JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTranscriptAsText(item);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        title="Export TXT"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Conversation Detail Inspector (7 cols) */}
        {selectedConv && (
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-20">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversation Audit</span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{selectedConv.customerName}</h2>
                <p className="text-xs text-slate-500">ID: {selectedConv.id}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportConversationAsJSON(selectedConv)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => exportTranscriptAsText(selectedConv)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1 shadow-2xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>TXT</span>
                </button>
              </div>
            </div>

            {/* Checklist Audit Summary */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                <span>Captured 7 Checklist Items</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Property Type</span>
                  <span className="font-semibold text-slate-800">{selectedConv.state.checklist.propertyType.value || 'Not captured'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Ownership Status</span>
                  <span className="font-semibold text-slate-800">{selectedConv.state.checklist.ownershipStatus.value || 'Not captured'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Original Documents</span>
                  <span className="font-semibold text-slate-800">
                    {selectedConv.state.checklist.originalDocuments.value !== null
                      ? selectedConv.state.checklist.originalDocuments.value ? 'Available' : 'Unavailable'
                      : 'Not captured'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Desired Loan Amount</span>
                  <span className="font-semibold text-slate-800">
                    {selectedConv.state.checklist.desiredLoanAmount.value
                      ? `₹${selectedConv.state.checklist.desiredLoanAmount.value.toLocaleString('en-IN')}`
                      : 'Not captured'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Occupation & Income</span>
                  <span className="font-semibold text-slate-800">
                    {selectedConv.state.checklist.occupation.value || 'N/A'} • {selectedConv.state.checklist.incomeMode.value || 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Repayment Tenure</span>
                  <span className="font-semibold text-slate-800">
                    {selectedConv.state.checklist.desiredTenureYears.value
                      ? `${selectedConv.state.checklist.desiredTenureYears.value} Years`
                      : 'Not captured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transcript Flow */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Turn-by-Turn Transcript ({selectedConv.transcript.length} turns)
              </h3>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-72 overflow-y-auto space-y-3 text-xs">
                {selectedConv.transcript.map((msg) => (
                  <div key={msg.id} className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-[10px]">
                      <span className={`font-bold ${msg.sender === 'agent' ? 'text-red-700' : 'text-blue-700'}`}>
                        {msg.sender === 'agent' ? 'Priya (Home Credit)' : msg.sender === 'customer' ? 'Customer' : 'System'}
                      </span>
                      <span className="text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-800 pl-2 bg-white p-2 rounded-lg border border-slate-100 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
