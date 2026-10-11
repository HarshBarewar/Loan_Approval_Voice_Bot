/**
 * Conversation State Machine
 * Deterministic transition management and structured state lifecycle.
 */

import {
  ConversationStage,
  ConversationState,
  EligibilityChecklist,
  ExtractedFacts,
  FieldStatus,
  FinalOutcome,
  TranscriptMessage
} from '../types.js';
import { RuleEvaluator } from './rule-evaluator.js';

export class StateMachine {
  /**
   * Create an initial blank conversation state
   */
  public static createInitialState(
    conversationId: string,
    customerName: string = 'Mr. Sharma',
    agentName: string = 'Priya from Home Credit'
  ): ConversationState {
    const now = new Date().toISOString();

    const emptyChecklist: EligibilityChecklist = {
      propertyType: { value: null, status: FieldStatus.UNKNOWN },
      ownershipStatus: { value: null, status: FieldStatus.UNKNOWN },
      originalDocuments: { value: null, status: FieldStatus.UNKNOWN },
      desiredLoanAmount: { value: null, status: FieldStatus.UNKNOWN },
      occupation: { value: null, status: FieldStatus.UNKNOWN },
      incomeMode: { value: null, status: FieldStatus.UNKNOWN },
      marketValue: { value: null, status: FieldStatus.UNKNOWN },
      desiredTenureYears: { value: null, status: FieldStatus.UNKNOWN },
    };

    return {
      conversationId,
      stage: ConversationStage.GREETING,
      customerName,
      agentName,
      isCustomerVerified: false,
      isCustomerAvailable: true,
      isOfferAccepted: null,
      existingPropertyLoan: null,
      emiReductionRequested: null,
      callbackTime: null,
      maxAmountCapOffered: false,
      maxAmountCapAccepted: null,
      checklist: emptyChecklist,
      overallEligibility: 'PENDING',
      disqualificationReason: null,
      finalOutcome: null,
      routingReason: null,
      nextMissingQuestion: 'What type of property do you own (Residential, Commercial, or Industrial)?',
      turnCount: 0,
      startedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Apply extracted facts to the conversation state
   */
  public static applyFacts(state: ConversationState, facts: ExtractedFacts): ConversationState {
    const updated = { ...state, checklist: { ...state.checklist } };
    const now = new Date().toISOString();
    updated.updatedAt = now;

    // Availability / Busy
    if (facts.isBusy === true) {
      updated.isCustomerAvailable = false;
    }
    if (facts.callbackTime) {
      updated.callbackTime = facts.callbackTime;
    }

    // Customer decline
    if (facts.customerDeclined === true) {
      updated.isOfferAccepted = false;
    }

    // Existing property loan & EMI reduction
    if (facts.existingPropertyLoan !== undefined && facts.existingPropertyLoan !== null) {
      updated.existingPropertyLoan = facts.existingPropertyLoan;
    }
    if (facts.emiReductionRequested !== undefined && facts.emiReductionRequested !== null) {
      updated.emiReductionRequested = facts.emiReductionRequested;
    }

    // Max loan cap alternative acceptance
    if (facts.maxAmountAccepted !== undefined && facts.maxAmountAccepted !== null) {
      updated.maxAmountCapAccepted = facts.maxAmountAccepted;
      if (facts.maxAmountAccepted === true) {
        updated.checklist.desiredLoanAmount = {
          value: RuleEvaluator.MAX_LOAN_AMOUNT,
          status: FieldStatus.CAPTURED,
          capturedAt: now
        };
      }
    }

    // Property Type
    if (facts.propertyType !== undefined && facts.propertyType !== null) {
      updated.checklist.propertyType = {
        value: facts.propertyType,
        status: FieldStatus.CAPTURED,
        capturedAt: now
      };
    }

    // Ownership Status
    if (facts.ownershipStatus !== undefined && facts.ownershipStatus !== null) {
      updated.checklist.ownershipStatus = {
        value: facts.ownershipStatus,
        status: FieldStatus.CAPTURED,
        capturedAt: now
      };
    }

    // Original Documents
    if (facts.originalDocuments !== undefined && facts.originalDocuments !== null) {
      updated.checklist.originalDocuments = {
        value: facts.originalDocuments,
        status: facts.originalDocuments ? FieldStatus.CAPTURED : FieldStatus.FAILED,
        capturedAt: now
      };
    }

    // Desired Loan Amount
    if (facts.loanAmountInr !== undefined && facts.loanAmountInr !== null) {
      updated.checklist.desiredLoanAmount = {
        value: facts.loanAmountInr,
        status: FieldStatus.CAPTURED,
        capturedAt: now
      };
    }

    // Occupation
    if (facts.occupation !== undefined && facts.occupation !== null) {
      updated.checklist.occupation = {
        value: facts.occupation,
        status: FieldStatus.CAPTURED,
        capturedAt: now
      };
    }

    // Income Mode
    if (facts.incomeMode !== undefined && facts.incomeMode !== null) {
      updated.checklist.incomeMode = {
        value: facts.incomeMode,
        status: facts.incomeMode === 'BANK' ? FieldStatus.CAPTURED : FieldStatus.FAILED,
        capturedAt: now
      };
    }

    // Property Market Value
    if (facts.marketValueInr !== undefined && facts.marketValueInr !== null) {
      updated.checklist.marketValue = {
        value: facts.marketValueInr,
        status: FieldStatus.CAPTURED,
        capturedAt: now
      };
    }

    // Desired Tenure
    if (facts.tenureYears !== undefined && facts.tenureYears !== null) {
      const isEligible = facts.tenureYears >= RuleEvaluator.MIN_TENURE_YEARS && facts.tenureYears <= RuleEvaluator.MAX_TENURE_YEARS;
      updated.checklist.desiredTenureYears = {
        value: facts.tenureYears,
        status: isEligible ? FieldStatus.CAPTURED : FieldStatus.FAILED,
        capturedAt: now
      };
    }

    return updated;
  }

  /**
   * Transition conversation stage based on business rule evaluation
   */
  public static transition(state: ConversationState): ConversationState {
    const evalResult = RuleEvaluator.evaluate(state);
    const updated = { ...state };

    updated.overallEligibility = evalResult.overallEligibility;
    updated.nextMissingQuestion = evalResult.nextMissingQuestion;

    if (evalResult.isCallback) {
      updated.stage = ConversationStage.CALLBACK_REQUESTED;
      updated.finalOutcome = FinalOutcome.CALLBACK_REQUESTED;
      updated.routingReason = `Customer busy; callback requested for ${state.callbackTime || 'later'}.`;
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    if (evalResult.isDeclined) {
      updated.stage = ConversationStage.DECLINED;
      updated.finalOutcome = FinalOutcome.DECLINED;
      updated.routingReason = 'Customer declined the pre-approved LAP offer.';
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    if (evalResult.isSpecialistTransfer) {
      updated.stage = ConversationStage.TRANSFER_SPECIALIST_REQUIRED;
      updated.finalOutcome = FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED;
      updated.routingReason = evalResult.transferReason;
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    if (evalResult.isMaxCapDeclined) {
      updated.stage = ConversationStage.COMPLETED;
      updated.finalOutcome = FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED;
      updated.routingReason = 'Customer declined maximum offer cap of ₹75 Lakhs.';
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    if (evalResult.isDisqualified) {
      updated.stage = ConversationStage.DISQUALIFIED;
      updated.finalOutcome = FinalOutcome.DISQUALIFIED;
      updated.disqualificationReason = evalResult.disqualificationReason;
      updated.routingReason = evalResult.disqualificationReason;
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    if (evalResult.isFullyQualified) {
      updated.stage = ConversationStage.QUALIFIED_FOR_HUMAN_HANDOFF;
      updated.finalOutcome = FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF;
      updated.routingReason = 'All 7 LAP eligibility requirements met successfully.';
      updated.completedAt = new Date().toISOString();
      return updated;
    }

    // If still in greeting/early verification but questions have started being answered
    if (updated.stage === ConversationStage.GREETING || updated.stage === ConversationStage.OFFER_PRESENTATION) {
      updated.stage = ConversationStage.QUALIFICATION;
    }

    return updated;
  }
}
