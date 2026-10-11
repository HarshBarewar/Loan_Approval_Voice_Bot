/**
 * Backend API Client Service
 */

import { ConversationState, ScenarioDefinition, ScenarioResult, TranscriptMessage } from '../types';

export const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getConfigStatus(): Promise<{
  openRouter: { isConfigured: boolean; model: string; maskedKey: string };
  environment: string;
}> {
  const res = await fetch(`${API_BASE}/config/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status} checking config status`);
  return res.json();
}

export async function testLLMConnection(): Promise<{
  success: boolean;
  message: string;
  model: string;
  latencyMs?: number;
  errorType?: string;
}> {
  const res = await fetch(`${API_BASE}/llm/test`, { method: 'POST' });
  return res.json();
}

export async function getAvailableModels(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${API_BASE}/llm/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  const data = await res.json();
  return data.models || [];
}

export async function createConversation(customerName?: string, agentName?: string): Promise<{
  conversationId: string;
  state: ConversationState;
  transcript: TranscriptMessage[];
  initialMessage: string;
}> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, agentName })
  });
  if (!res.ok) throw new Error('Failed to initialize conversation');
  return res.json();
}

export async function sendMessage(
  conversationId: string,
  message: string,
  forceScripted: boolean = false
): Promise<{
  conversationId: string;
  assistantResponse: string;
  stage: any;
  checklist: any;
  nextMissingQuestion: string | null;
  overallEligibility: any;
  finalOutcome: any;
  routingReason: string | null;
  disqualificationReason: string | null;
  turnCount: number;
  transcript: TranscriptMessage[];
  state?: ConversationState;
  usedLLM: boolean;
  llmModel?: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, forceScripted })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Error processing message (HTTP ${res.status})`);
  }
  return res.json();
}

export async function endConversation(conversationId: string): Promise<{
  state: ConversationState;
  transcript: TranscriptMessage[];
}> {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}/end`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to end conversation');
  return res.json();
}

export async function getScenarios(): Promise<ScenarioDefinition[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  const data = await res.json();
  return data.scenarios || [];
}

export async function runScenario(scenarioId: string, useLiveLLM: boolean = false): Promise<ScenarioResult> {
  const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ useLiveLLM })
  });
  if (!res.ok) throw new Error('Failed to execute scenario');
  return res.json();
}

export async function runAllScenarios(useLiveLLM: boolean = false): Promise<{
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: ScenarioResult[];
}> {
  const res = await fetch(`${API_BASE}/scenarios/run-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ useLiveLLM })
  });
  if (!res.ok) throw new Error('Failed to run all scenarios');
  return res.json();
}
