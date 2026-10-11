import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { OverviewView } from './views/OverviewView';
import { VoiceAgentView } from './views/VoiceAgentView';
import { ScenariosView } from './views/ScenariosView';
import { HistoryView } from './views/HistoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { getSavedConversations } from './services/storage';
import { getConfigStatus } from './services/api';
import { SavedConversation } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [openRouterConfigured, setOpenRouterConfigured] = useState<boolean>(false);
  const [openRouterModel, setOpenRouterModel] = useState<string>('google/gemini-2.0-flash-001');

  // Browser Audio Detection
  const sttSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const loadData = () => {
    const list = getSavedConversations();
    setConversations(list);
  };

  const loadConfig = async () => {
    try {
      const cfg = await getConfigStatus();
      setOpenRouterConfigured(cfg.openRouter.isConfigured);
      setOpenRouterModel(cfg.openRouter.model);
    } catch (e) {
      console.warn('Could not load backend config status:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        openRouterConfigured={openRouterConfigured}
        openRouterModel={openRouterModel}
        sttSupported={sttSupported}
        ttsSupported={ttsSupported}
      />

      {/* Main App Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewView
              conversations={conversations}
              openRouterConfigured={openRouterConfigured}
              openRouterModel={openRouterModel}
              sttSupported={sttSupported}
              ttsSupported={ttsSupported}
              onStartCall={() => setActiveTab('workspace')}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'workspace' && (
            <VoiceAgentView
              onConversationSaved={() => {
                loadData();
              }}
            />
          )}

          {activeTab === 'scenarios' && (
            <ScenariosView />
          )}

          {activeTab === 'history' && (
            <HistoryView
              conversations={conversations}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView conversations={conversations} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              openRouterConfigured={openRouterConfigured}
              openRouterModel={openRouterModel}
              sttSupported={sttSupported}
              ttsSupported={ttsSupported}
              onRefreshConfig={loadConfig}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
