/**
 * Local Storage Persistence and Export Manager
 */

import { SavedConversation, ConversationState, TranscriptMessage } from '../types';

const STORAGE_KEY = 'hc_voice_agent_conversations_v1';
const PREFS_KEY = 'hc_voice_agent_preferences_v1';

export interface UserPreferences {
  language: 'en-IN' | 'en-US' | 'hi-IN';
  speechRate: number;
  autoPlayVoice: boolean;
  selectedVoiceURI: string;
}

export const defaultPreferences: UserPreferences = {
  language: 'en-IN',
  speechRate: 1.0,
  autoPlayVoice: true,
  selectedVoiceURI: ''
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: Partial<UserPreferences>) {
  try {
    const current = getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save preferences:', e);
  }
}

export function getSavedConversations(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveConversation(
  id: string,
  customerName: string,
  state: ConversationState,
  transcript: TranscriptMessage[],
  durationSeconds: number = 0
) {
  try {
    const existing = getSavedConversations();
    const index = existing.findIndex(c => c.id === id);

    const record: SavedConversation = {
      id,
      customerName,
      state,
      transcript,
      durationSeconds,
      savedAt: new Date().toISOString()
    };

    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.unshift(record);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50))); // Keep last 50
  } catch (e) {
    console.error('Failed to save conversation to localStorage:', e);
  }
}

export function deleteSavedConversation(id: string) {
  try {
    const list = getSavedConversations().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to delete conversation:', e);
  }
}

export function clearAllSavedConversations() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear conversations:', e);
  }
}

export function exportConversationAsJSON(item: SavedConversation) {
  const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `home-credit-transcript-${item.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTranscriptAsText(item: SavedConversation) {
  const lines = [
    `=======================================================`,
    `HOME CREDIT LOAN AGAINST PROPERTY (LAP) CONVERSATION TRANSCRIPT`,
    `=======================================================`,
    `Conversation ID : ${item.id}`,
    `Customer Name   : ${item.customerName}`,
    `Date            : ${new Date(item.savedAt).toLocaleString()}`,
    `Duration        : ${item.durationSeconds}s`,
    `Final Outcome   : ${item.state.finalOutcome || 'INCOMPLETE'}`,
    `Routing Reason  : ${item.state.routingReason || 'N/A'}`,
    `-------------------------------------------------------`,
    `ELIGIBILITY CHECKLIST SUMMARY:`,
    `- Property Type      : ${item.state.checklist.propertyType.value || 'Not captured'} (${item.state.checklist.propertyType.status})`,
    `- Ownership Status   : ${item.state.checklist.ownershipStatus.value || 'Not captured'} (${item.state.checklist.ownershipStatus.status})`,
    `- Original Documents : ${item.state.checklist.originalDocuments.value !== null ? (item.state.checklist.originalDocuments.value ? 'Available' : 'Unavailable') : 'Not captured'} (${item.state.checklist.originalDocuments.status})`,
    `- Desired Loan Amount: ${item.state.checklist.desiredLoanAmount.value ? '₹' + item.state.checklist.desiredLoanAmount.value.toLocaleString('en-IN') : 'Not captured'} (${item.state.checklist.desiredLoanAmount.status})`,
    `- Occupation         : ${item.state.checklist.occupation.value || 'Not captured'} (${item.state.checklist.occupation.status})`,
    `- Income Mode        : ${item.state.checklist.incomeMode.value || 'Not captured'} (${item.state.checklist.incomeMode.status})`,
    `- Property Market Val: ${item.state.checklist.marketValue.value ? '₹' + item.state.checklist.marketValue.value.toLocaleString('en-IN') : 'Not captured'} (${item.state.checklist.marketValue.status})`,
    `- Repayment Tenure   : ${item.state.checklist.desiredTenureYears.value ? item.state.checklist.desiredTenureYears.value + ' Years' : 'Not captured'} (${item.state.checklist.desiredTenureYears.status})`,
    `-------------------------------------------------------`,
    `CONVERSATION TRANSCRIPT:`,
    ...item.transcript.map(t => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      const speaker = t.sender === 'customer' ? 'Customer' : t.sender === 'agent' ? 'Priya (Home Credit)' : 'System';
      return `[${time}] ${speaker}: ${t.text}`;
    }),
    `=======================================================`
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `home-credit-transcript-${item.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
