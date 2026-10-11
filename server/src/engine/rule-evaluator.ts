/**
 * Home Credit Rule Evaluator
 * Strict deterministic business rules implementation as defined in specifications.
 */

import {
  ConversationState,
  FieldStatus,
  FinalOutcome,
  IncomeMode,
  OccupationType,
  OwnershipStatus,
  PropertyType
} from '../types.js';

export interface RuleEvaluationResult {
  isDisqualified: boolean;
  disqualificationReason: string | null;
  isSpecialistTransfer: boolean;
  transferReason: string | null;
  isDeclined: boolean;
  isCallback: boolean;
  isMaxCapDeclined: boolean;
  isFullyQualified: boolean;
  nextMissingQuestion: string | null;
  overallEligibility: 'PENDING' | 'ELIGIBLE' | 'DISQUALIFIED' | 'SPECIALIST_TRANSFER';
  finalOutcome: FinalOutcome | null;
}

export class RuleEvaluator {
  public static readonly MAX_LOAN_AMOUNT = 7500000; // ₹75 Lakhs
  public static readonly MIN_TENURE_YEARS = 3;
  public static readonly MAX_TENURE_YEARS = 15;

  /**
   * Evaluate all business rules against current conversation state.
   */
  public static evaluate(state: ConversationState): RuleEvaluationResult {
    const checklist = state.checklist;

    // 1. Check Busy / Callback Request
    if (!state.isCustomerAvailable && state.callbackTime) {
      return {
        isDisqualified: false,
        disqualificationReason: null,
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: false,
        isCallback: true,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'PENDING',
        finalOutcome: FinalOutcome.CALLBACK_REQUESTED
      };
    }

    // 2. Check Customer Declined Offer
    if (state.isOfferAccepted === false) {
      return {
        isDisqualified: false,
        disqualificationReason: null,
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: true,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'PENDING',
        finalOutcome: FinalOutcome.DECLINED
      };
    }

    // 3. Check Existing Loan against Property or EMI-reduction request -> Specialist Flow
    if (state.existingPropertyLoan === true || state.emiReductionRequested === true) {
      const reason = state.emiReductionRequested
        ? 'Customer requested an EMI reduction on their current mortgage.'
        : 'Customer has an existing loan secured against the property; balance transfer specialist required.';
      return {
        isDisqualified: false,
        disqualificationReason: null,
        isSpecialistTransfer: true,
        transferReason: reason,
        isDeclined: false,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'SPECIALIST_TRANSFER',
        finalOutcome: FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED
      };
    }

    // 4. Check Disqualification Criterion 1: Property Type
    if (checklist.propertyType.value === PropertyType.AGRICULTURAL) {
      return {
        isDisqualified: true,
        disqualificationReason: 'Agricultural properties are not eligible under this Loan Against Property scheme. Only residential, commercial, or industrial properties qualify.',
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: false,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'DISQUALIFIED',
        finalOutcome: FinalOutcome.DISQUALIFIED
      };
    }

    // 5. Check Disqualification Criterion 2: Original Property Documents
    if (checklist.originalDocuments.value === false) {
      return {
        isDisqualified: true,
        disqualificationReason: 'Original property documents are unavailable. Original title deeds are mandatory for physical verification under Home Credit policy.',
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: false,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'DISQUALIFIED',
        finalOutcome: FinalOutcome.DISQUALIFIED
      };
    }

    // 6. Check Loan Amount: > 75 Lakhs alternative flow
    if (checklist.desiredLoanAmount.value !== null && checklist.desiredLoanAmount.value > this.MAX_LOAN_AMOUNT) {
      if (state.maxAmountCapAccepted === false) {
        return {
          isDisqualified: false,
          disqualificationReason: null,
          isSpecialistTransfer: false,
          transferReason: null,
          isDeclined: false,
          isCallback: false,
          isMaxCapDeclined: true,
          isFullyQualified: false,
          nextMissingQuestion: null,
          overallEligibility: 'PENDING',
          finalOutcome: FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED
        };
      }
      // If user accepted cap, it will have been normalized to 7500000 in orchestrator/state.
    }

    // 7. Check Disqualification Criterion 3: Income Mode
    if (checklist.incomeMode.value === IncomeMode.CASH) {
      return {
        isDisqualified: true,
        disqualificationReason: 'Income is received in cash. Home Credit requires income to be credited through an official bank account.',
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: false,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: false,
        nextMissingQuestion: null,
        overallEligibility: 'DISQUALIFIED',
        finalOutcome: FinalOutcome.DISQUALIFIED
      };
    }

    // 8. Check Disqualification Criterion 4: Repayment Tenure
    if (checklist.desiredTenureYears.value !== null) {
      const tenure = checklist.desiredTenureYears.value;
      if (tenure < this.MIN_TENURE_YEARS || tenure > this.MAX_TENURE_YEARS) {
        return {
          isDisqualified: true,
          disqualificationReason: `Requested tenure of ${tenure} year${tenure === 1 ? '' : 's'} is outside the eligible range. Home Credit LAP tenure must be between 3 and 15 years.`,
          isSpecialistTransfer: false,
          transferReason: null,
          isDeclined: false,
          isCallback: false,
          isMaxCapDeclined: false,
          isFullyQualified: false,
          nextMissingQuestion: null,
          overallEligibility: 'DISQUALIFIED',
          finalOutcome: FinalOutcome.DISQUALIFIED
        };
      }
    }

    // 9. Determine Next Missing Question across the 7 checklist items
    const nextMissing = this.getNextMissingQuestion(checklist);

    // 10. Check if All 7 Items are Confirmed/Captured and Valid
    const all7Completed =
      checklist.propertyType.value !== null &&
      checklist.ownershipStatus.value !== null &&
      checklist.originalDocuments.value === true &&
      checklist.desiredLoanAmount.value !== null &&
      checklist.desiredLoanAmount.value <= this.MAX_LOAN_AMOUNT &&
      checklist.occupation.value !== null &&
      checklist.incomeMode.value === IncomeMode.BANK &&
      checklist.marketValue.value !== null &&
      checklist.desiredTenureYears.value !== null &&
      checklist.desiredTenureYears.value >= this.MIN_TENURE_YEARS &&
      checklist.desiredTenureYears.value <= this.MAX_TENURE_YEARS;

    if (all7Completed) {
      return {
        isDisqualified: false,
        disqualificationReason: null,
        isSpecialistTransfer: false,
        transferReason: null,
        isDeclined: false,
        isCallback: false,
        isMaxCapDeclined: false,
        isFullyQualified: true,
        nextMissingQuestion: null,
        overallEligibility: 'ELIGIBLE',
        finalOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF
      };
    }

    return {
      isDisqualified: false,
      disqualificationReason: null,
      isSpecialistTransfer: false,
      transferReason: null,
      isDeclined: false,
      isCallback: false,
      isMaxCapDeclined: false,
      isFullyQualified: false,
      nextMissingQuestion: nextMissing,
      overallEligibility: 'PENDING',
      finalOutcome: null
    };
  }

  /**
   * Identifies the earliest unanswered checklist item in prescribed order
   */
  public static getNextMissingQuestion(checklist: ConversationState['checklist']): string | null {
    if (checklist.propertyType.value === null) {
      return 'What type of property do you own (Residential, Commercial, or Industrial)?';
    }
    if (checklist.ownershipStatus.value === null) {
      return 'Is the property solely in your name, or is it jointly owned?';
    }
    if (checklist.originalDocuments.value === null) {
      return 'Are the original title documents and property deeds available for physical verification?';
    }
    if (checklist.desiredLoanAmount.value === null) {
      return 'What is the loan amount you are looking for? (Up to ₹75 Lakhs)';
    }
    if (checklist.occupation.value === null || checklist.incomeMode.value === null) {
      if (checklist.occupation.value === null && checklist.incomeMode.value === null) {
        return 'What is your current occupation, and is your monthly income received through a bank account?';
      }
      if (checklist.occupation.value === null) {
        return 'Are you currently salaried or self-employed?';
      }
      return 'Do you receive your income through a bank account or in cash?';
    }
    if (checklist.marketValue.value === null) {
      return 'What is your estimated current market value of the property?';
    }
    if (checklist.desiredTenureYears.value === null) {
      return 'What repayment tenure would you prefer, between 3 and 15 years?';
    }
    return null;
  }
}
