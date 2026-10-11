/**
 * Predefined Test Scenarios
 * Defines all required evaluation scenarios, expected outcomes, and assertion hooks.
 */

import {
  FinalOutcome,
  IncomeMode,
  OccupationType,
  OwnershipStatus,
  PropertyType,
  ScenarioDefinition
} from '../types.js';

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'fully-eligible-residential',
    name: 'Fully Eligible Residential Customer',
    description: 'A customer with residential property, sole ownership, original deeds, ₹50L loan, salaried bank income, ₹1 Cr market value, and 10-year tenure.',
    category: 'eligibility',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'I have a residential house in Delhi.' },
      { role: 'customer', text: 'It is solely owned in my name.' },
      { role: 'customer', text: 'Yes, all original title deeds are available at my home.' },
      { role: 'customer', text: 'I am looking for a loan of fifty lakhs.' },
      { role: 'customer', text: 'I am salaried and my salary is credited into my HDFC bank account.' },
      { role: 'customer', text: 'The estimated market value is around 1 crore.' },
      { role: 'customer', text: 'I would like a repayment tenure of 10 years.' },
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF &&
        state.checklist.propertyType.value === PropertyType.RESIDENTIAL &&
        state.checklist.originalDocuments.value === true &&
        state.checklist.desiredLoanAmount.value === 5000000 &&
        state.checklist.incomeMode.value === IncomeMode.BANK &&
        state.checklist.desiredTenureYears.value === 10;
      return {
        pass,
        details: pass ? 'Customer fully qualified with all 7 fields confirmed.' : 'Failed to reach qualified state.'
      };
    }
  },
  {
    id: 'agricultural-property-disqualification',
    name: 'Agricultural Property Disqualification',
    description: 'A customer provides agricultural farmland, which must immediately trigger disqualification without asking further questions.',
    category: 'disqualification',
    expectedOutcome: FinalOutcome.DISQUALIFIED,
    expectedDisqualificationReason: 'Agricultural properties are not eligible',
    script: [
      { role: 'customer', text: 'I have an agricultural farmland property in Punjab.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.DISQUALIFIED &&
        state.checklist.propertyType.value === PropertyType.AGRICULTURAL;
      return {
        pass,
        details: pass ? 'Immediate disqualification for agricultural property verified.' : 'Did not disqualify immediately.'
      };
    }
  },
  {
    id: 'unavailable-original-documents',
    name: 'Unavailable Original Documents Disqualification',
    description: 'Customer only has photocopies/xerox copies because originals are unavailable. Must trigger immediate disqualification.',
    category: 'disqualification',
    expectedOutcome: FinalOutcome.DISQUALIFIED,
    expectedDisqualificationReason: 'Original property documents are unavailable',
    script: [
      { role: 'customer', text: 'It is a residential apartment.' },
      { role: 'customer', text: 'Jointly owned with my wife.' },
      { role: 'customer', text: 'No, I only have photocopies and xerox copies. Original papers are not available.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.DISQUALIFIED &&
        state.checklist.originalDocuments.value === false;
      return {
        pass,
        details: pass ? 'Immediate disqualification for missing original documents verified.' : 'Did not disqualify on missing originals.'
      };
    }
  },
  {
    id: 'cash-income-disqualification',
    name: 'Cash Income Disqualification',
    description: 'Customer receives income in cash instead of through a bank account. Must immediately disqualify.',
    category: 'disqualification',
    expectedOutcome: FinalOutcome.DISQUALIFIED,
    expectedDisqualificationReason: 'Income is received in cash',
    script: [
      { role: 'customer', text: 'Commercial shop.' },
      { role: 'customer', text: 'Sole ownership.' },
      { role: 'customer', text: 'Yes, original documents are available in my locker.' },
      { role: 'customer', text: 'I need 25 lakhs.' },
      { role: 'customer', text: 'I run a local shop and take all my earnings in cash.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.DISQUALIFIED &&
        state.checklist.incomeMode.value === IncomeMode.CASH;
      return {
        pass,
        details: pass ? 'Immediate disqualification for cash income verified.' : 'Did not disqualify for cash income.'
      };
    }
  },
  {
    id: 'tenure-below-minimum',
    name: 'Tenure Below Minimum (2 Years)',
    description: 'Customer requests a 2-year tenure (below the minimum allowed 3 years). Must immediately disqualify.',
    category: 'disqualification',
    expectedOutcome: FinalOutcome.DISQUALIFIED,
    script: [
      { role: 'customer', text: 'Residential flat.' },
      { role: 'customer', text: 'Sole owner.' },
      { role: 'customer', text: 'Yes, original title deeds are available.' },
      { role: 'customer', text: 'I need 30 lakhs.' },
      { role: 'customer', text: 'Salaried, bank transfer.' },
      { role: 'customer', text: 'Market value is 60 lakhs.' },
      { role: 'customer', text: 'I want a tenure of two years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.DISQUALIFIED &&
        state.checklist.desiredTenureYears.value === 2;
      return {
        pass,
        details: pass ? 'Immediate disqualification for 2-year tenure verified.' : 'Did not disqualify on < 3 year tenure.'
      };
    }
  },
  {
    id: 'tenure-above-maximum',
    name: 'Tenure Above Maximum (16 Years)',
    description: 'Customer requests a 16-year tenure (above the maximum allowed 15 years). Must immediately disqualify.',
    category: 'disqualification',
    expectedOutcome: FinalOutcome.DISQUALIFIED,
    script: [
      { role: 'customer', text: 'Residential flat.' },
      { role: 'customer', text: 'Sole owner.' },
      { role: 'customer', text: 'Original documents are at home.' },
      { role: 'customer', text: '40 lakhs.' },
      { role: 'customer', text: 'Salaried, bank account.' },
      { role: 'customer', text: '80 lakhs market value.' },
      { role: 'customer', text: 'I need a 16 years tenure.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.DISQUALIFIED &&
        state.checklist.desiredTenureYears.value === 16;
      return {
        pass,
        details: pass ? 'Immediate disqualification for 16-year tenure verified.' : 'Did not disqualify on > 15 year tenure.'
      };
    }
  },
  {
    id: 'loan-amount-above-75l-accepted',
    name: 'Loan Amount > ₹75L with Cap Accepted',
    description: 'Customer requests ₹90 Lakhs, agent offers ₹75 Lakhs cap, customer agrees, continues to qualification.',
    category: 'eligibility',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'Residential house.' },
      { role: 'customer', text: 'Jointly owned with my wife.' },
      { role: 'customer', text: 'Original papers at home.' },
      { role: 'customer', text: 'I need ninety lakh rupees.' },
      { role: 'customer', text: 'Yes proceed with 75 lakh.' },
      { role: 'customer', text: 'Self-employed, income credited in bank.' },
      { role: 'customer', text: 'Market value is 1.5 crore.' },
      { role: 'customer', text: 'Tenure is 10 years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF &&
        state.checklist.desiredLoanAmount.value === 7500000;
      return {
        pass,
        details: pass ? 'Customer accepted 75L cap and qualified.' : 'Failed 75L cap acceptance qualification.'
      };
    }
  },
  {
    id: 'loan-amount-above-75l-declined',
    name: 'Loan Amount > ₹75L with Cap Declined',
    description: 'Customer requests ₹90 Lakhs, agent offers ₹75L cap, customer declines. Concludes as Maximum Amount Not Accepted.',
    category: 'eligibility',
    expectedOutcome: FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED,
    script: [
      { role: 'customer', text: 'Residential house.' },
      { role: 'customer', text: 'Sole ownership.' },
      { role: 'customer', text: 'Original papers are available.' },
      { role: 'customer', text: 'I need 90 lakhs.' },
      { role: 'customer', text: 'No 75 is not enough, cannot proceed with 75.' }
    ],
    expectedStateAssertions: (state) => {
      const pass = state.finalOutcome === FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED;
      return {
        pass,
        details: pass ? 'Customer declined cap and ended as MAXIMUM_AMOUNT_NOT_ACCEPTED.' : 'Failed cap rejection handling.'
      };
    }
  },
  {
    id: 'joint-ownership-eligible',
    name: 'Joint Ownership Eligibility',
    description: 'Confirms joint ownership is completely eligible and does not trigger disqualification.',
    category: 'eligibility',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'Commercial office.' },
      { role: 'customer', text: 'Jointly owned with my brother.' },
      { role: 'customer', text: 'Yes, original documents are available.' },
      { role: 'customer', text: '35 lakhs.' },
      { role: 'customer', text: 'Salaried, bank account.' },
      { role: 'customer', text: 'Market value 70 lakhs.' },
      { role: 'customer', text: 'Tenure 5 years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF &&
        state.checklist.ownershipStatus.value === OwnershipStatus.JOINT;
      return {
        pass,
        details: pass ? 'Joint ownership accepted and qualified.' : 'Joint ownership failed.'
      };
    }
  },
  {
    id: 'existing-property-loan',
    name: 'Existing Property Loan -> Transfer Specialist',
    description: 'Customer mentions having an existing loan against the property. Must immediately route to Loan Transfer Specialist.',
    category: 'transfer',
    expectedOutcome: FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED,
    script: [
      { role: 'customer', text: 'Actually, I already have an existing loan on this property with another bank.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED &&
        state.existingPropertyLoan === true;
      return {
        pass,
        details: pass ? 'Correctly routed to Loan Transfer Specialist for existing mortgage.' : 'Did not route to specialist.'
      };
    }
  },
  {
    id: 'emi-reduction-request',
    name: 'EMI Reduction Request -> Transfer Specialist',
    description: 'Customer wants to reduce their existing EMI. Must route to Loan Transfer Specialist without asking the 7 fresh questions.',
    category: 'transfer',
    expectedOutcome: FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED,
    script: [
      { role: 'customer', text: 'I want to reduce my EMI on my current loan.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.LOAN_TRANSFER_SPECIALIST_REQUIRED &&
        state.emiReductionRequested === true;
      return {
        pass,
        details: pass ? 'Correctly routed to specialist for EMI reduction request.' : 'Did not route to specialist.'
      };
    }
  },
  {
    id: 'busy-customer-callback',
    name: 'Busy Customer Callback Handling',
    description: 'Customer is busy and requests a callback at 5 PM. Ends as Callback Requested.',
    category: 'dialogue',
    expectedOutcome: FinalOutcome.CALLBACK_REQUESTED,
    script: [
      { role: 'customer', text: 'I am driving right now and busy. Please call at 5 PM.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.finalOutcome === FinalOutcome.CALLBACK_REQUESTED &&
        state.isCustomerAvailable === false;
      return {
        pass,
        details: pass ? 'Callback recorded politely without continuing questionnaire.' : 'Failed callback flow.'
      };
    }
  },
  {
    id: 'out-of-order-answers',
    name: 'Out-of-Order Multi-Fact Capture',
    description: 'Customer provides 4 facts at once: "I have a residential house, jointly owned with my wife, worth 1 crore, and need 50 lakh". All 4 captured immediately.',
    category: 'edge_case',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'I have a residential house, it is jointly owned with my wife, worth 1 crore, and I need fifty lakhs.' },
      { role: 'customer', text: 'Yes, original title deeds are available at home.' },
      { role: 'customer', text: 'I am salaried and my income comes into my bank account.' },
      { role: 'customer', text: 'Repayment tenure 10 years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.checklist.propertyType.value === PropertyType.RESIDENTIAL &&
        state.checklist.ownershipStatus.value === OwnershipStatus.JOINT &&
        state.checklist.marketValue.value === 10000000 &&
        state.checklist.desiredLoanAmount.value === 5000000 &&
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF;
      return {
        pass,
        details: pass ? 'All 4 out-of-order facts captured without duplicate questions.' : 'Failed out-of-order capture.'
      };
    }
  },
  {
    id: 'customer-correction',
    name: 'Customer Answer Correction',
    description: 'Customer corrects tenure: "My tenure is 10 years. Actually, make that 12 years." State preserves 12 years.',
    category: 'edge_case',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'Residential flat.' },
      { role: 'customer', text: 'Sole ownership.' },
      { role: 'customer', text: 'Original deeds are available.' },
      { role: 'customer', text: '40 lakhs.' },
      { role: 'customer', text: 'Salaried bank transfer.' },
      { role: 'customer', text: 'Market value 75 lakhs.' },
      { role: 'customer', text: 'Tenure is 10 years. Actually, make that 12 years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.checklist.desiredTenureYears.value === 12 &&
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF;
      return {
        pass,
        details: pass ? 'Correction to 12 years successfully overwritten and preserved.' : 'Failed correction preservation.'
      };
    }
  },
  {
    id: 'customer-interruption-interest-rate',
    name: 'Customer Interruption (Interest Rate Question)',
    description: 'Customer interrupts with "What is your interest rate?". Agent defers to expert without inventing rates, then continues qualification.',
    category: 'dialogue',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'Residential home.' },
      { role: 'customer', text: 'Sole ownership.' },
      { role: 'customer', text: 'Wait, what interest rate do you offer?' },
      { role: 'customer', text: 'Yes, original documents are available at home.' },
      { role: 'customer', text: '45 lakhs.' },
      { role: 'customer', text: 'Self-employed, bank credit.' },
      { role: 'customer', text: 'Market value 90 lakhs.' },
      { role: 'customer', text: '10 years tenure.' }
    ],
    expectedStateAssertions: (state) => {
      const pass = state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF;
      return {
        pass,
        details: pass ? 'Handled rate inquiry gracefully without skipping checklist items.' : 'Failed rate interruption handling.'
      };
    }
  },
  {
    id: 'ambiguous-documents-clarification',
    name: 'Ambiguous Documents Clarification',
    description: 'Customer answers "The documents should be somewhere". Agent clarifies rather than assuming availability.',
    category: 'edge_case',
    expectedOutcome: FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF,
    script: [
      { role: 'customer', text: 'Residential house.' },
      { role: 'customer', text: 'Sole ownership.' },
      { role: 'customer', text: 'The documents should be somewhere.' },
      { role: 'customer', text: 'Yes, I checked and all original deeds are available.' },
      { role: 'customer', text: '50 lakhs.' },
      { role: 'customer', text: 'Salaried bank transfer.' },
      { role: 'customer', text: '1 crore.' },
      { role: 'customer', text: '5 years.' }
    ],
    expectedStateAssertions: (state) => {
      const pass =
        state.checklist.originalDocuments.value === true &&
        state.finalOutcome === FinalOutcome.QUALIFIED_FOR_HUMAN_HANDOFF;
      return {
        pass,
        details: pass ? 'Correctly sought clarification on ambiguous document statement before confirming.' : 'Failed clarification test.'
      };
    }
  }
];
