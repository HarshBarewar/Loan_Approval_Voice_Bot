import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Bot,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Filter,
  CheckCheck
} from 'lucide-react';
import { ScenarioDefinition, ScenarioResult } from '../types';
import * as api from '../services/api';

export const ScenariosView: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [useLiveLLM, setUseLiveLLM] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const list = await api.getScenarios();
      setScenarios(list);
    } catch (err: any) {
      setErrorMsg(`Failed to load scenarios: ${err.message}`);
    }
  };

  const handleRunSingle = async (id: string) => {
    try {
      setRunningId(id);
      setErrorMsg(null);
      const res = await api.runScenario(id, useLiveLLM);
      setResults(prev => ({ ...prev, [id]: res }));
    } catch (err: any) {
      setErrorMsg(`Error running scenario: ${err.message}`);
    } finally {
      setRunningId(null);
    }
  };

  const handleRunAll = async () => {
    try {
      setIsRunningAll(true);
      setErrorMsg(null);
      const response = await api.runAllScenarios(useLiveLLM);
      const map: Record<string, ScenarioResult> = {};
      response.results.forEach(r => {
        map[r.scenarioId] = r;
      });
      setResults(map);
    } catch (err: any) {
      setErrorMsg(`Failed to run scenario suite: ${err.message}`);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleExportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      useLiveLLM,
      totalScenarios: scenarios.length,
      executedCount: completedResults.length,
      passedCount,
      passRate: `${passRate}%`,
      results
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-credit-test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedResults = Object.values(results);
  const passedCount = completedResults.filter(r => r.passed).length;
  const passRate = completedResults.length > 0 ? Math.round((passedCount / completedResults.length) * 100) : 0;
  const avgTime = completedResults.length > 0 
    ? Math.round(completedResults.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0) / completedResults.length)
    : 0;

  const filteredScenarios = useMemo(() => {
    return scenarios.filter(sc => {
      const matchesCategory = selectedCategory === 'ALL' || sc.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sc.initialUtterance && sc.initialUtterance.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [scenarios, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Predefined Test Scenarios</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Automated test suite verifying all 16+ Home Credit qualification rules: agricultural land, missing deeds, cash income, tenure bounds, cap negotiations, out-of-order facts, and interruptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export Report if any run */}
          {completedResults.length > 0 && (
            <button
              onClick={handleExportResults}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
              title="Download test results as JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Report</span>
            </button>
          )}

          {/* Live LLM Mode Toggle */}
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useLiveLLM}
              onChange={(e) => setUseLiveLLM(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <Bot className="w-4 h-4 text-slate-500" />
            <span>Use Live OpenRouter</span>
          </label>

          {/* Run All Button */}
          <button
            onClick={handleRunAll}
            disabled={isRunningAll || scenarios.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunningAll ? 'Running All Scenarios...' : 'Run All Scenarios'}</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Results Summary Bar */}
      {completedResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div>
            <span className="text-[11px] text-slate-400 block font-semibold uppercase">Executed</span>
            <span className="text-xl font-bold text-slate-800">{completedResults.length} / {scenarios.length}</span>
          </div>
          <div>
            <span className="text-[11px] text-emerald-600 block font-semibold uppercase">Passed</span>
            <span className="text-xl font-bold text-emerald-700">{passedCount}</span>
          </div>
          <div>
            <span className="text-[11px] text-rose-600 block font-semibold uppercase">Failed</span>
            <span className="text-xl font-bold text-rose-700">{completedResults.length - passedCount}</span>
          </div>
          <div>
            <span className="text-[11px] text-blue-600 block font-semibold uppercase">Pass Rate</span>
            <span className="text-xl font-bold text-blue-700">{passRate}%</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold uppercase">Avg Latency</span>
            <span className="text-xl font-bold text-slate-700">{avgTime}ms</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'All Tests' },
              { id: 'eligibility', label: 'Eligible Paths' },
              { id: 'disqualification', label: 'Disqualifications' },
              { id: 'transfer', label: 'Specialist Transfer' },
              { id: 'dialogue', label: 'Dialogue Flow' },
              { id: 'edge_case', label: 'Edge Cases' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Scenarios Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <FlaskConical className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">No scenarios match your search filter</p>
          <p className="text-xs text-slate-400">Try adjusting your category selection or clear search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScenarios.map((sc) => {
          const res = results[sc.id];
          const isRunning = runningId === sc.id;
          const isExpanded = expandedId === sc.id;

          return (
            <div
              key={sc.id}
              className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all ${
                res
                  ? res.passed
                    ? 'border-emerald-200'
                    : 'border-rose-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {sc.category}
                    </span>
                    <span className="text-xs text-slate-400">• {sc.turnCount} turns</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{sc.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{sc.description}</p>
                </div>

                {/* Status Badge */}
                {res && (
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                      res.passed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {res.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{res.passed ? 'PASSED' : 'FAILED'}</span>
                  </span>
                )}
              </div>

              {/* Initial Customer Script Preview */}
              {sc.initialUtterance && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Initial Utterance:</span>
                  <p className="italic font-medium">"{sc.initialUtterance}"</p>
                </div>
              )}

              {/* Expected vs Actual Details if run */}
              {res && (
                <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Expected Outcome:</span>
                    <span className="font-semibold text-slate-800">{sc.expectedOutcome}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Actual Outcome:</span>
                    <span className={`font-semibold ${res.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {res.actualOutcome || 'INCOMPLETE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{res.executionTimeMs}ms</span>
                    </span>
                    <span>{res.isLiveLLM ? 'Live OpenRouter' : 'Scripted (0 credits)'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sc.id)}
                  disabled={!res}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 flex items-center space-x-1 cursor-pointer"
                >
                  <span>{isExpanded ? 'Hide Transcript' : 'View Transcript'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => handleRunSingle(sc.id)}
                  disabled={isRunning || isRunningAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{isRunning ? 'Running...' : 'Run Test'}</span>
                </button>
              </div>

              {/* Expanded Transcript Drawer */}
              {isExpanded && res && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 max-h-60 overflow-y-auto">
                  <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">Generated Dialogue Transcript:</div>
                  {res.transcript.map((msg, i) => (
                    <div key={i} className="space-y-0.5">
                      <span className={`font-semibold text-[11px] ${msg.sender === 'agent' ? 'text-red-700' : 'text-blue-700'}`}>
                        {msg.sender === 'agent' ? 'Agent (Home Credit):' : 'Customer:'}
                      </span>
                      <p className="text-slate-700 pl-2">{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};

