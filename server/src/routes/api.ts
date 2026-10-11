/**
 * Express REST API Routes
 */

import { Router, Request, Response } from 'express';
import { ConversationOrchestrator } from '../engine/conversation-orchestrator.js';
import { StateMachine } from '../engine/state-machine.js';
import { OpenRouterService } from '../services/openrouter.js';
import { SCENARIO_DEFINITIONS } from '../scenarios/definitions.js';
import { ScenarioRunner } from '../scenarios/runner.js';
import { ConversationState, FinalOutcome, TranscriptMessage } from '../types.js';

// In-memory active conversations store for local demo
const conversationsStore: Map<string, { state: ConversationState; transcript: TranscriptMessage[] }> = new Map();

export function createApiRouter(
  openRouterService: OpenRouterService,
  orchestrator: ConversationOrchestrator
): Router {
  const router = Router();
  const scenarioRunner = new ScenarioRunner(orchestrator);

  /**
   * Health Check
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Home Credit AI Voice Agent API',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Config Status
   */
  router.get('/config/status', (_req: Request, res: Response) => {
    const config = openRouterService.getConfig();
    res.json({
      openRouter: {
        isConfigured: config.isConfigured,
        model: config.model,
        maskedKey: config.maskedKey
      },
      environment: process.env.NODE_ENV || 'development'
    });
  });

  /**
   * Test Connection to OpenRouter
   */
  router.post('/llm/test', async (_req: Request, res: Response) => {
    try {
      const result = await openRouterService.testConnection();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message,
        errorType: 'UNKNOWN'
      });
    }
  });

  /**
   * Fetch Available OpenRouter Models
   */
  router.get('/llm/models', async (_req: Request, res: Response) => {
    try {
      const models = await openRouterService.getAvailableModels();
      res.json({ models });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Create New Conversation
   */
  router.post('/conversations', (req: Request, res: Response) => {
    const { customerName, agentName, language } = req.body || {};
    const selectedLang: 'en-IN' | 'hi-IN' = language === 'hi-IN' ? 'hi-IN' : 'en-IN';
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const state = StateMachine.createInitialState(
      conversationId,
      customerName || (selectedLang === 'hi-IN' ? 'श्री शर्मा' : 'Mr. Sharma'),
      agentName || (selectedLang === 'hi-IN' ? 'प्रिया (होम क्रेडिट)' : 'Priya (Home Credit)'),
      selectedLang
    );

    // Initial Greeting Message from Agent (Localized)
    const initialGreeting = selectedLang === 'hi-IN'
      ? `नमस्ते! क्या मेरी बात संपत्ति के मालिक से हो रही है? मैं होम क्रेडिट से प्रिया बोल रही हूँ, आपके ₹75 लाख तक के प्री-अप्रूव्ड लोन अगेंस्ट प्रॉपर्टी ऑफर के संबंध में। क्या आपके पास बात करने के लिए दो मिनट का समय है?`
      : `Hello! Am I speaking with the property owner? This is ${state.agentName} regarding your pre-approved Home Credit Loan Against Property offer of up to ₹75 Lakhs. Do you have a moment?`;

    const initialAgentMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-init`,
      conversationId,
      sender: 'agent',
      text: initialGreeting,
      timestamp: new Date().toISOString(),
      stageAtTurn: state.stage
    };

    const transcript: TranscriptMessage[] = [initialAgentMsg];
    conversationsStore.set(conversationId, { state, transcript });

    res.status(201).json({
      conversationId,
      state,
      transcript,
      initialMessage: initialGreeting
    });
  });

  /**
   * List All Conversations
   */
  router.get('/conversations', (_req: Request, res: Response) => {
    const list = Array.from(conversationsStore.values()).map(item => ({
      conversationId: item.state.conversationId,
      customerName: item.state.customerName,
      stage: item.state.stage,
      finalOutcome: item.state.finalOutcome,
      overallEligibility: item.state.overallEligibility,
      startedAt: item.state.startedAt,
      completedAt: item.state.completedAt,
      turnCount: item.state.turnCount,
      messageCount: item.transcript.length,
      checklist: item.state.checklist
    }));
    res.json({ conversations: list });
  });

  /**
   * Get Single Conversation
   */
  router.get('/conversations/:id', (req: Request, res: Response) => {
    const session = conversationsStore.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(session);
  });

  /**
   * Send Message to Conversation
   */
  router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
    const { message, forceScripted, language } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const session = conversationsStore.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Sync session language if requested dynamically by client
    if (language === 'hi-IN' || language === 'en-IN') {
      session.state.language = language;
    }

    try {
      const result = await orchestrator.processMessage(
        session.state,
        session.transcript,
        message.trim(),
        Boolean(forceScripted)
      );

      // Update in-memory session
      session.state = {
        ...session.state,
        stage: result.stage,
        checklist: result.checklist,
        overallEligibility: result.overallEligibility,
        finalOutcome: result.finalOutcome,
        routingReason: result.routingReason,
        disqualificationReason: result.disqualificationReason,
        nextMissingQuestion: result.nextMissingQuestion,
        turnCount: result.turnCount,
        completedAt: result.finalOutcome ? new Date().toISOString() : undefined
      };
      session.transcript = result.transcript;
      conversationsStore.set(req.params.id, session);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        error: err.message,
        safeFallbackMessage: 'I apologize, but I had trouble understanding that. Could you please repeat your answer?'
      });
    }
  });

  /**
   * End Conversation Early
   */
  router.post('/conversations/:id/end', (req: Request, res: Response) => {
    const session = conversationsStore.get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (session.state.finalOutcome === null) {
      session.state.finalOutcome = FinalOutcome.INCOMPLETE;
      session.state.routingReason = 'Conversation ended before completing qualification questions.';
      session.state.completedAt = new Date().toISOString();
    }

    const endMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-end`,
      conversationId: session.state.conversationId,
      sender: 'system',
      text: 'Conversation ended by user.',
      timestamp: new Date().toISOString(),
      stageAtTurn: session.state.stage
    };
    session.transcript.push(endMsg);
    conversationsStore.set(req.params.id, session);

    res.json({ state: session.state, transcript: session.transcript });
  });

  /**
   * Delete Single Conversation
   */
  router.delete('/conversations/:id', (req: Request, res: Response) => {
    const deleted = conversationsStore.delete(req.params.id);
    res.json({ success: deleted });
  });

  /**
   * Delete All Conversations
   */
  router.delete('/conversations', (_req: Request, res: Response) => {
    conversationsStore.clear();
    res.json({ success: true, message: 'All local demo conversations cleared.' });
  });

  /**
   * List All Test Scenarios
   */
  router.get('/scenarios', (_req: Request, res: Response) => {
    res.json({
      scenarios: SCENARIO_DEFINITIONS.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        expectedOutcome: s.expectedOutcome,
        turnCount: s.script.length,
        initialUtterance: s.script[0]?.text
      }))
    });
  });

  /**
   * Run Single Scenario
   */
  router.post('/scenarios/:id/run', async (req: Request, res: Response) => {
    const scenario = SCENARIO_DEFINITIONS.find(s => s.id === req.params.id);
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    const useLiveLLM = Boolean(req.body?.useLiveLLM);
    try {
      const result = await scenarioRunner.runScenario(scenario, useLiveLLM);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * Run All Scenarios
   */
  router.post('/scenarios/run-all', async (req: Request, res: Response) => {
    const useLiveLLM = Boolean(req.body?.useLiveLLM);
    try {
      const results = await scenarioRunner.runAll(SCENARIO_DEFINITIONS, useLiveLLM);
      const passedCount = results.filter(r => r.passed).length;
      res.json({
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
        passRate: Math.round((passedCount / results.length) * 100),
        results
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
