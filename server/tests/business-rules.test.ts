/**
 * Home Credit AI Voice Agent — Business Rules & State Machine Automated Test Suite
 * Tests 1 - 34 as mandated by Section 19.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationOrchestrator } from '../src/engine/conversation-orchestrator.js';
import { NLPExtractor } from '../src/engine/nlp-extractor.js';
import { RuleEvaluator } from '../src/engine/rule-evaluator.js';
import { StateMachine } from '../src/engine/state-machine.js';
import { OpenRouterService } from '../src/services/openrouter.js';
import {
  ConversationStage,
  FinalOutcome,
  IncomeMode,
  OccupationType,
  OwnershipStatus,
  PropertyType
} from '../src/types.js';

describe('Home Credit LAP Business Rules & State Machine', () => {
  let openRouterService: OpenRouterService;
  let orchestrator: ConversationOrchestrator;

  beforeEach(() => {
    // Unconfigured OpenRouter instance to enforce local deterministic business logic
    openRouterService = new OpenRouterService({ apiKey: '', model: 'test' });
    orchestrator = new ConversationOrchestrator(openRouterService);
  });

  // 1. Fully eligible residential-property customer
  it('1. A fully eligible residential-property customer reaches QUALIFIED_FOR_HUMAN_HANDOFF', async () => {
    let state = StateMachine.createInitialState('test-1');
    let transcript: any[] = [];

    const turns = [
      'Residential house',
      'Sole ownership',
      'Yes original documents are available at home',
      'Fifty lakhs',
      'Salaried with bank credit',
      'One crore market value',
      '10 years tenure'
    ];

    for (const msg of turns) {
      const res = await orchestrator.processMessage(state, transcript, msg, true);
      state = { ...state, ...res, checklist: res.checklist };
      transcript = res.transcript;
    }

    expect(state.finalOutcome).toBe(FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF);
    expect(state.overallEligibility).toBe('ELIGIBLE');
  });

  // 2. Agricultural property causes immediate disqualification
  it('2. Agricultural property causes immediate disqualification', async () => {
    const state = StateMachine.createInitialState('test-2');
    const res = await orchestrator.processMessage(state, [], 'I have an agricultural farm land property', true);

    expect(res.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(res.stage).toBe(ConversationStage.DISQUALIFIED);
    expect(res.checklist.propertyType.value).toBe(PropertyType.AGRICULTURAL);
    expect(res.disqualificationReason).toContain('Agricultural');
  });

  // 3. Joint ownership remains eligible
  it('3. Joint ownership remains eligible', () => {
    let state = StateMachine.createInitialState('test-3');
    state = StateMachine.applyFacts(state, { ownershipStatus: OwnershipStatus.JOINT });
    const evalRes = RuleEvaluator.evaluate(state);

    expect(evalRes.isDisqualified).toBe(false);
    expect(state.checklist.ownershipStatus.value).toBe(OwnershipStatus.JOINT);
  });

  // 4. Sole ownership remains eligible
  it('4. Sole ownership remains eligible', () => {
    let state = StateMachine.createInitialState('test-4');
    state = StateMachine.applyFacts(state, { ownershipStatus: OwnershipStatus.SOLE });
    const evalRes = RuleEvaluator.evaluate(state);

    expect(evalRes.isDisqualified).toBe(false);
    expect(state.checklist.ownershipStatus.value).toBe(OwnershipStatus.SOLE);
  });

  // 5. Unavailable original documents cause disqualification
  it('5. Unavailable original documents cause disqualification', async () => {
    let state = StateMachine.createInitialState('test-5');
    const res = await orchestrator.processMessage(state, [], 'No, only copies and xerox exist, original papers are not available', true);

    expect(res.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(res.checklist.originalDocuments.value).toBe(false);
  });

  // 6. Documents available at home count as available
  it('6. Documents available at home count as available', () => {
    const facts = NLPExtractor.extractFacts('I have all the original papers at home');
    expect(facts.originalDocuments).toBe(true);

    let state = StateMachine.createInitialState('test-6');
    state = StateMachine.applyFacts(state, facts);
    expect(state.checklist.originalDocuments.value).toBe(true);
  });

  // 7. A ₹50 lakh request proceeds
  it('7. A ₹50 lakh request proceeds without triggering cap warning', () => {
    const parsed = NLPExtractor.parseCurrencyINR('fifty lakhs');
    expect(parsed).toBe(5000000);

    let state = StateMachine.createInitialState('test-7');
    state = StateMachine.applyFacts(state, { loanAmountInr: parsed });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isMaxCapDeclined).toBe(false);
    expect(state.checklist.desiredLoanAmount.value).toBe(5000000);
  });

  // 8. A ₹75 lakh request proceeds
  it('8. A ₹75 lakh request proceeds as it is exactly at the maximum cap', () => {
    const parsed = NLPExtractor.parseCurrencyINR('75 lakhs');
    expect(parsed).toBe(7500000);

    let state = StateMachine.createInitialState('test-8');
    state = StateMachine.applyFacts(state, { loanAmountInr: parsed });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isMaxCapDeclined).toBe(false);
  });

  // 9. A ₹90 lakh request triggers the ₹75 lakh alternative
  it('9. A ₹90 lakh request triggers the ₹75 lakh alternative', async () => {
    const state = StateMachine.createInitialState('test-9');
    const res = await orchestrator.processMessage(state, [], 'I need ninety lakhs', true);

    expect(res.assistantResponse).toContain('₹75 Lakhs');
    expect(res.assistantResponse).toContain('proceed');
  });

  // 10. Accepting the alternative updates the amount to ₹75 lakh
  it('10. Accepting the alternative updates the amount to ₹75 lakh', async () => {
    let state = StateMachine.createInitialState('test-10');
    let res = await orchestrator.processMessage(state, [], 'I need 90 lakhs', true);
    state = { ...state, ...res, checklist: res.checklist };

    res = await orchestrator.processMessage(state, res.transcript, 'Yes proceed with 75 lakh', true);
    expect(res.checklist.desiredLoanAmount.value).toBe(7500000);
  });

  // 11. Declining the alternative ends the flow appropriately
  it('11. Declining the alternative ends the flow with MAXIMUM_AMOUNT_NOT_ACCEPTED', async () => {
    let state = StateMachine.createInitialState('test-11');
    let res = await orchestrator.processMessage(state, [], 'I need 90 lakhs', true);
    state = { ...state, ...res, checklist: res.checklist };

    res = await orchestrator.processMessage(state, res.transcript, 'No 75 is not enough, cannot proceed with 75', true);
    expect(res.finalOutcome).toBe(FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED);
  });

  // 12. Salaried bank income remains eligible
  it('12. Salaried bank income remains eligible', () => {
    let state = StateMachine.createInitialState('test-12');
    state = StateMachine.applyFacts(state, { occupation: OccupationType.SALARIED, incomeMode: IncomeMode.BANK });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isDisqualified).toBe(false);
  });

  // 13. Self-employed bank income remains eligible
  it('13. Self-employed bank income remains eligible', () => {
    let state = StateMachine.createInitialState('test-13');
    state = StateMachine.applyFacts(state, { occupation: OccupationType.SELF_EMPLOYED, incomeMode: IncomeMode.BANK });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isDisqualified).toBe(false);
  });

  // 14. Cash income causes immediate disqualification
  it('14. Cash income causes immediate disqualification', async () => {
    const state = StateMachine.createInitialState('test-14');
    const res = await orchestrator.processMessage(state, [], 'I take all my income in cash', true);

    expect(res.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(res.disqualificationReason).toContain('cash');
  });

  // 15. Property market value has no invented minimum threshold
  it('15. Property market value has no invented minimum threshold', () => {
    let state = StateMachine.createInitialState('test-15');
    // Even an estimated market value of 15 lakhs should not be disqualified by policy
    state = StateMachine.applyFacts(state, { marketValueInr: 1500000 });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isDisqualified).toBe(false);
  });

  // 16. A 3-year tenure is accepted
  it('16. A 3-year tenure is accepted', () => {
    let state = StateMachine.createInitialState('test-16');
    state = StateMachine.applyFacts(state, { tenureYears: 3 });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isDisqualified).toBe(false);
    expect(state.checklist.desiredTenureYears.value).toBe(3);
  });

  // 17. A 15-year tenure is accepted
  it('17. A 15-year tenure is accepted', () => {
    let state = StateMachine.createInitialState('test-17');
    state = StateMachine.applyFacts(state, { tenureYears: 15 });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isDisqualified).toBe(false);
    expect(state.checklist.desiredTenureYears.value).toBe(15);
  });

  // 18. A 2-year tenure causes disqualification
  it('18. A 2-year tenure causes disqualification', async () => {
    const state = StateMachine.createInitialState('test-18');
    const res = await orchestrator.processMessage(state, [], 'I want a tenure of two years', true);
    expect(res.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(res.disqualificationReason).toContain('between 3 and 15 years');
  });

  // 19. A 16-year tenure causes disqualification
  it('19. A 16-year tenure causes disqualification', async () => {
    const state = StateMachine.createInitialState('test-19');
    const res = await orchestrator.processMessage(state, [], 'I need a tenure of 16 years', true);
    expect(res.finalOutcome).toBe(FinalOutcome.DISQUALIFIED);
    expect(res.disqualificationReason).toContain('between 3 and 15 years');
  });

  // 20. Existing property loan triggers the specialist flow
  it('20. Existing property loan triggers the specialist flow', async () => {
    const state = StateMachine.createInitialState('test-20');
    const res = await orchestrator.processMessage(state, [], 'I already have a loan on this property with another bank', true);
    expect(res.finalOutcome).toBe(FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED);
    expect(res.stage).toBe(ConversationStage.TRANSFER_SPECIALIST_REQUIRED);
  });

  // 21. EMI-reduction requests trigger the specialist flow
  it('21. EMI-reduction requests trigger the specialist flow', async () => {
    const state = StateMachine.createInitialState('test-21');
    const res = await orchestrator.processMessage(state, [], 'Can you help reduce my EMI on my current mortgage?', true);
    expect(res.finalOutcome).toBe(FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED);
    expect(res.stage).toBe(ConversationStage.TRANSFER_SPECIALIST_REQUIRED);
  });

  // 22. A busy customer receives the callback-time question / recorded
  it('22. A busy customer receives the callback-time handling and ends as CALLBACK_REQUESTED', async () => {
    const state = StateMachine.createInitialState('test-22');
    const res = await orchestrator.processMessage(state, [], 'I am busy right now, please call at 5 PM', true);
    expect(res.finalOutcome).toBe(FinalOutcome.CALLBACK_REQUESTED);
    expect(res.stage).toBe(ConversationStage.CALLBACK_REQUESTED);
  });

  // 23. A customer who declines is not qualified
  it('23. A customer who declines is not qualified', async () => {
    const state = StateMachine.createInitialState('test-23');
    const res = await orchestrator.processMessage(state, [], 'No thanks, I am not interested in any loan', true);
    expect(res.finalOutcome).toBe(FinalOutcome.DECLINED);
    expect(res.stage).toBe(ConversationStage.DECLINED);
  });

  // 24. Out-of-order answers are all captured
  it('24. Out-of-order answers are all captured in a single turn', async () => {
    const state = StateMachine.createInitialState('test-24');
    const res = await orchestrator.processMessage(
      state,
      [],
      'I have a residential house, it is jointly owned with my wife, worth 1 crore, and I need fifty lakhs',
      true
    );

    expect(res.checklist.propertyType.value).toBe(PropertyType.RESIDENTIAL);
    expect(res.checklist.ownershipStatus.value).toBe(OwnershipStatus.JOINT);
    expect(res.checklist.marketValue.value).toBe(10000000);
    expect(res.checklist.desiredLoanAmount.value).toBe(5000000);
  });

  // 25. Corrected answers overwrite previous valid values
  it('25. Corrected answers overwrite previous valid values', async () => {
    let state = StateMachine.createInitialState('test-25');
    state = StateMachine.applyFacts(state, { tenureYears: 10 });
    expect(state.checklist.desiredTenureYears.value).toBe(10);

    const res = await orchestrator.processMessage(state, [], 'Actually make that 12 years', true);
    expect(res.checklist.desiredTenureYears.value).toBe(12);
  });

  // 26. Ambiguous document availability triggers clarification
  it('26. Ambiguous document availability triggers clarification', async () => {
    const state = StateMachine.createInitialState('test-26');
    const res = await orchestrator.processMessage(state, [], 'The documents should be somewhere', true);
    expect(res.stage).toBe(ConversationStage.CLARIFICATION);
    expect(res.assistantResponse).toContain('original');
  });

  // 27. An unrelated question does not skip eligibility questions
  it('27. An unrelated question does not skip eligibility questions', async () => {
    const state = StateMachine.createInitialState('test-27');
    const res = await orchestrator.processMessage(state, [], 'What company are you calling from?', true);
    expect(res.assistantResponse).toContain('Home Credit');
    expect(res.nextMissingQuestion).toBeDefined();
  });

  // 28. Interest-rate questions do not cause invented rates
  it('28. Interest-rate questions do not cause invented rates', async () => {
    const state = StateMachine.createInitialState('test-28');
    const res = await orchestrator.processMessage(state, [], 'What is your interest rate?', true);
    expect(res.assistantResponse).toContain('senior loan expert');
    expect(res.assistantResponse).not.toMatch(/\b\d+(\.\d+)?%/); // No invented rate percentage!
  });

  // 29. No handoff occurs before all seven items are answered
  it('29. No handoff occurs before all seven items are answered', () => {
    let state = StateMachine.createInitialState('test-29');
    state = StateMachine.applyFacts(state, {
      propertyType: PropertyType.RESIDENTIAL,
      ownershipStatus: OwnershipStatus.SOLE,
      originalDocuments: true,
      loanAmountInr: 5000000,
      occupation: OccupationType.SALARIED,
      incomeMode: IncomeMode.BANK,
      // marketValue missing!
      tenureYears: 10
    });
    const evalRes = RuleEvaluator.evaluate(state);
    expect(evalRes.isFullyQualified).toBe(false);
    expect(evalRes.finalOutcome).toBeNull();
  });

  // 30. No LLM error results in automatic approval
  it('30. No LLM error results in automatic approval', async () => {
    const faultyService = new OpenRouterService({ apiKey: 'fake-key' });
    // Mock extractAndRespond to throw an error
    faultyService.extractAndRespond = async () => {
      throw new Error('LLM connection failed');
    };
    const orch = new ConversationOrchestrator(faultyService);
    const state = StateMachine.createInitialState('test-30');

    const res = await orch.processMessage(state, [], 'Hello', false);
    expect(res.overallEligibility).not.toBe('ELIGIBLE');
    expect(res.finalOutcome).not.toBe(FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF);
  });

  // 31. Invalid structured output is handled safely
  it('31. Invalid structured output is handled safely without crashing', async () => {
    const faultyService = new OpenRouterService({ apiKey: 'fake-key' });
    faultyService.extractAndRespond = async () => {
      return {
        intent: 'other',
        facts: {} as any,
        clarificationNeeded: false
      };
    };
    const orch = new ConversationOrchestrator(faultyService);
    const state = StateMachine.createInitialState('test-31');

    const res = await orch.processMessage(state, [], 'Yes', false);
    expect(res.stage).toBeDefined();
    expect(res.assistantResponse).toBeDefined();
  });

  // 32. Duplicate message submissions do not duplicate state changes
  it('32. Duplicate message submissions do not duplicate state changes', async () => {
    let state = StateMachine.createInitialState('test-32');
    let transcript: any[] = [];

    const res1 = await orchestrator.processMessage(state, transcript, 'Residential flat', true);
    state = { ...state, ...res1, checklist: res1.checklist };
    transcript = res1.transcript;

    const res2 = await orchestrator.processMessage(state, transcript, 'Residential flat', true);
    expect(res2.checklist.propertyType.value).toBe(PropertyType.RESIDENTIAL);
  });

  // 33. Ended conversations cannot continue qualification unintentionally
  it('33. Ended conversations cannot continue qualification unintentionally', async () => {
    let state = StateMachine.createInitialState('test-33');
    state.stage = ConversationStage.DISQUALIFIED;
    state.finalOutcome = FinalOutcome.DISQUALIFIED;

    const res = await orchestrator.processMessage(state, [], 'Can I answer again?', true);
    expect(res.assistantResponse).toContain('already concluded');
  });

  // 34. Interrupted or incomplete conversation is not falsely marked qualified
  it('34. Interrupted or incomplete conversation is not falsely marked qualified', () => {
    const state = StateMachine.createInitialState('test-34');
    expect(state.overallEligibility).toBe('PENDING');
    expect(state.finalOutcome).toBeNull();
  });
});
