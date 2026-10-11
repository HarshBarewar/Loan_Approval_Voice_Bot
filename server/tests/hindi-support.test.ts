/**
 * Hindi Language & Bilingual Interaction Tests
 * Verifies that selecting Hindi ensures the AI Voice Agent explicitly speaks
 * and converses in Hindi Devanagari, respects business rules, and parses Hindi speech.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { NLPExtractor } from '../src/engine/nlp-extractor.js';
import { ConversationOrchestrator } from '../src/engine/conversation-orchestrator.js';
import { StateMachine } from '../src/engine/state-machine.js';
import { OpenRouterService } from '../src/services/openrouter.js';
import { ConversationStage, FinalOutcome, PropertyType, OwnershipStatus } from '../src/types.js';

describe('Hindi Language Voice Agent Support', () => {
  it('1. POST /api/conversations with language hi-IN returns Devanagari Hindi greeting', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({ language: 'hi-IN' });

    expect(res.status).toBe(201);
    expect(res.body.state.language).toBe('hi-IN');
    // Agent name and greeting must be explicitly in Hindi
    expect(res.body.state.agentName).toContain('प्रिया');
    expect(res.body.initialMessage).toMatch(/[\u0900-\u097F]/); // Contains Devanagari characters
    expect(res.body.initialMessage).toContain('नमस्ते');
    expect(res.body.initialMessage).toContain('होम क्रेडिट');
  });

  it('2. Hindi NLPExtractor correctly parses Indian numbers, currency, and property types', () => {
    expect(NLPExtractor.parseCurrencyINR('पचास लाख')).toBe(5000000);
    expect(NLPExtractor.parseCurrencyINR('पचहत्तर लाख')).toBe(7500000);
    expect(NLPExtractor.parseCurrencyINR('एक करोड़')).toBe(10000000);
    expect(NLPExtractor.parseCurrencyINR('50 लाख')).toBe(5000000);

    expect(NLPExtractor.parseTenure('10 साल')).toBe(10);
    expect(NLPExtractor.parseTenure('5 वर्ष')).toBe(5);
    expect(NLPExtractor.parseTenure('पंद्रह साल')).toBe(15);

    const resFacts = NLPExtractor.extractFacts('यह आवासीय मकान है');
    expect(resFacts.propertyType).toBe(PropertyType.RESIDENTIAL);

    const agriFacts = NLPExtractor.extractFacts('यह खेती की ज़मीन है');
    expect(agriFacts.propertyType).toBe(PropertyType.AGRICULTURAL);

    const docFacts = NLPExtractor.extractFacts('मूल दस्तावेज़ घर पर उपलब्ध हैं');
    expect(docFacts.originalDocuments).toBe(true);

    const cashFacts = NLPExtractor.extractFacts('वेतन नकद हाथ में मिलता है');
    expect(cashFacts.incomeMode).toBe('CASH');

    const bankFacts = NLPExtractor.extractFacts('नौकरी करता हूँ और वेतन बैंक खाते में आता है');
    expect(bankFacts.occupation).toBe('SALARIED');
    expect(bankFacts.incomeMode).toBe('BANK');

    const loanFacts = NLPExtractor.extractFacts('इस प्रॉपर्टी पर पहले से लोन चल रहा है');
    expect(loanFacts.existingPropertyLoan).toBe(true);

    const busyFacts = NLPExtractor.extractFacts('मैं व्यस्त हूँ बाद में फोन करो');
    expect(busyFacts.isBusy).toBe(true);
  });

  it('3. Responding in Hindi advances qualification and assistant replies strictly in Hindi', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    const state = StateMachine.createInitialState('hindi-conv-1', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    const transcript: any[] = [];

    // Step 1: Property Type answer
    const turn1 = await orchestrator.processMessage(
      state,
      transcript,
      'मेरे पास आवासीय फ्लैट है',
      true
    );

    expect(turn1.checklist.propertyType.value).toBe(PropertyType.RESIDENTIAL);
    // Response must be in Hindi
    expect(turn1.assistantResponse).toMatch(/[\u0900-\u097F]/);
    expect(turn1.assistantResponse).toContain('स्वामित्व');
  });

  it('4. Agricultural property in Hindi immediately disqualifies with polite Hindi explanation', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    const state = StateMachine.createInitialState('hindi-conv-2', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    const transcript: any[] = [];

    const turn1 = await orchestrator.processMessage(
      state,
      transcript,
      'यह खेती की ज़मीन है',
      true
    );

    expect(turn1.stage).toBe(ConversationStage.DISQUALIFIED);
    expect(turn1.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    // Response must explicitly explain in Hindi
    expect(turn1.assistantResponse).toMatch(/[\u0900-\u097F]/);
    expect(turn1.assistantResponse).toContain('कृषि भूमि');
  });

  it('5. Existing loan in Hindi routes to Loan Transfer Specialist with Hindi notification', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    const state = StateMachine.createInitialState('hindi-conv-3', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    const transcript: any[] = [];

    const turn1 = await orchestrator.processMessage(
      state,
      transcript,
      'इस घर पर पहले से लोन चल रहा है और मुझे ईएमआई कम करानी है',
      true
    );

    expect(turn1.stage).toBe(ConversationStage.TRANSFER_SPECIALIST_REQUIRED);
    expect(turn1.finalOutcome).toBe(FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED);
    expect(turn1.assistantResponse).toMatch(/[\u0900-\u097F]/);
    expect(turn1.assistantResponse).toContain('स्पेशलिस्ट');
  });

  it('6. Full successful Hindi qualification results in qualified handoff with Hindi congratulatory message', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    let state = StateMachine.createInitialState('hindi-conv-4', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    let transcript: any[] = [];

    // Provide all 7 facts in Hindi
    const turn1 = await orchestrator.processMessage(
      state,
      transcript,
      'मेरे पास आवासीय मकान है, खुद का नाम है, मूल दस्तावेज़ उपलब्ध हैं, 50 लाख का लोन चाहिए, नौकरीपेशा हूँ, वेतन बैंक में आता है, मूल्य 1 करोड़ है, और 10 साल की अवधि चाहिए',
      true
    );

    expect(turn1.stage).toBe(ConversationStage.QUALIFIED_FOR_HUMAN_HANDOFF);
    expect(turn1.finalOutcome).toBe(FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF);
    expect(turn1.assistantResponse).toMatch(/[\u0900-\u097F]/);
    expect(turn1.assistantResponse).toContain('बधाई हो');
  });

  it('7. Answering "नहीं" when asked about original documents immediately disqualifies', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    let state = StateMachine.createInitialState('hindi-conv-5', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    // Set propertyType and ownershipStatus so next question is original documents
    state = StateMachine.applyFacts(state, {
      propertyType: PropertyType.RESIDENTIAL,
      ownershipStatus: OwnershipStatus.SOLE
    });
    state = StateMachine.transition(state);
    expect(state.nextMissingQuestion).toContain('मूल दस्तावेज़');

    const turn = await orchestrator.processMessage(state, [], 'नहीं', true);

    expect(turn.checklist.originalDocuments.value).toBe(false);
    expect(turn.stage).toBe(ConversationStage.DISQUALIFIED);
    expect(turn.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(turn.assistantResponse).toContain('मूल दस्तावेज़');
  });

  it('8. Answering "नहीं उपलब्ध नहीं है" or "नहीं उसे पर" disqualifies with Hindi explanation', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    let state = StateMachine.createInitialState('hindi-conv-6', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    state = StateMachine.applyFacts(state, {
      propertyType: PropertyType.RESIDENTIAL,
      ownershipStatus: 'SOLE' as any
    });

    const turn1 = await orchestrator.processMessage(state, [], 'नहीं उपलब्ध नहीं है', true);
    expect(turn1.checklist.originalDocuments.value).toBe(false);
    expect(turn1.stage).toBe(ConversationStage.DISQUALIFIED);

    const turn2 = await orchestrator.processMessage(state, [], 'नहीं उसे पर', true);
    expect(turn2.checklist.originalDocuments.value).toBe(false);
    expect(turn2.stage).toBe(ConversationStage.DISQUALIFIED);
  });

  it('9. "मूल दस्तावेज उपलब्ध नहीं है" is recognized as missing documents (never true)', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    let state = StateMachine.createInitialState('hindi-conv-7', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    state = StateMachine.applyFacts(state, {
      propertyType: PropertyType.RESIDENTIAL,
      ownershipStatus: 'SOLE' as any
    });

    const turn = await orchestrator.processMessage(state, [], 'मूल दस्तावेज उपलब्ध नहीं है', true);
    expect(turn.checklist.originalDocuments.value).toBe(false);
    expect(turn.stage).toBe(ConversationStage.DISQUALIFIED);
  });

  it('10. Answering "हाँ" or "उपलब्ध हैं" captures documents and advances to loan amount', async () => {
    const orchestrator = new ConversationOrchestrator(new OpenRouterService());
    let state = StateMachine.createInitialState('hindi-conv-8', 'श्री शर्मा', 'प्रिया', 'hi-IN');
    state = StateMachine.applyFacts(state, {
      propertyType: PropertyType.RESIDENTIAL,
      ownershipStatus: 'SOLE' as any
    });

    const turn = await orchestrator.processMessage(state, [], 'हाँ, उपलब्ध हैं', true);
    expect(turn.checklist.originalDocuments.value).toBe(true);
    expect(turn.stage).not.toBe(ConversationStage.DISQUALIFIED);
    expect(turn.assistantResponse).toContain('लोन');
  });
});
