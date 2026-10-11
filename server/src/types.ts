/**
 * Home Credit AI Voice Agent — Core Domain Types and Enums
 */

export enum ConversationStage {
  GREETING = 'GREETING',
  VERIFICATION = 'VERIFICATION',
  AVAILABILITY_CHECK = 'AVAILABILITY_CHECK',
  OFFER_PRESENTATION = 'OFFER_PRESENTATION',
  TRANSFER_DETECTION = 'TRANSFER_DETECTION',
  QUALIFICATION = 'QUALIFICATION',
  CLARIFICATION = 'CLARIFICATION',
  DISQUALIFIED = 'DISQUALIFIED',
  CALLBACK_REQUESTED = 'CALLBACK_REQUESTED',
  DECLINED = 'DECLINED',
  TRANSFER_SPECIALIST_REQUIRED = 'TRANSFER_SPECIALIST_REQUIRED',
  QUALIFIED_FOR_HUMAN_HANDOFF = 'QUALIFIED_FOR_HUMAN_HANDOFF',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum FinalOutcome {
  QUALIFIED_FOR_HUMAN_HANDOFF = 'QUALIFIED_FOR_HUMAN_HANDOFF',
  DISQUALIFIED = 'DISQUALIFIED',
  CALLBACK_REQUESTED = 'CALLBACK_REQUESTED',
  DECLINED = 'DECLINED',
  LOAN_TRANSFER_SPECIALIST_REQUIRED = 'LOAN_TRANSFER_SPECIALIST_REQUIRED',
  MAXIMUM_AMOUNT_NOT_ACCEPTED = 'MAXIMUM_AMOUNT_NOT_ACCEPTED',
  INCOMPLETE = 'INCOMPLETE',
  ERROR = 'ERROR'
}

export enum FieldStatus {
  UNKNOWN = 'UNKNOWN',
  CAPTURED = 'CAPTURED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  AGRICULTURAL = 'AGRICULTURAL'
}

export enum OwnershipStatus {
  SOLE = 'SOLE',
  JOINT = 'JOINT'
}

export enum OccupationType {
  SALARIED = 'SALARIED',
  SELF_EMPLOYED = 'SELF_EMPLOYED'
}

export enum IncomeMode {
  BANK = 'BANK',
  CASH = 'CASH'
}

export interface EligibilityField<T> {
  value: T | null;
  status: FieldStatus;
  rawAnswer?: string;
  capturedAt?: string;
}

export interface EligibilityChecklist {
  propertyType: EligibilityField<PropertyType>;
  ownershipStatus: EligibilityField<OwnershipStatus>;
  originalDocuments: EligibilityField<boolean>;
  desiredLoanAmount: EligibilityField<number>; // Normalized numeric in INR
  occupation: EligibilityField<OccupationType>;
  incomeMode: EligibilityField<IncomeMode>;
  marketValue: EligibilityField<number>; // Normalized numeric in INR (estimated)
  desiredTenureYears: EligibilityField<number>; // 3 to 15 years
}

export interface ConversationState {
  conversationId: string;
  stage: ConversationStage;
  customerName: string;
  agentName: string;
  language: 'en-IN' | 'hi-IN';
  isCustomerVerified: boolean;
  isCustomerAvailable: boolean;
  isOfferAccepted: boolean | null;
  existingPropertyLoan: boolean | null;
  emiReductionRequested: boolean | null;
  callbackTime: string | null;
  maxAmountCapOffered: boolean;
  maxAmountCapAccepted: boolean | null;
  
  checklist: EligibilityChecklist;
  
  overallEligibility: 'PENDING' | 'ELIGIBLE' | 'DISQUALIFIED' | 'SPECIALIST_TRANSFER';
  disqualificationReason: string | null;
  finalOutcome: FinalOutcome | null;
  routingReason: string | null;
  nextMissingQuestion: string | null;
  
  turnCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TranscriptMessage {
  id: string;
  conversationId: string;
  sender: 'agent' | 'customer' | 'system';
  text: string;
  timestamp: string;
  stageAtTurn: ConversationStage;
  capturedFacts?: Record<string, any>;
  isError?: boolean;
}

export interface ExtractedFacts {
  propertyType?: PropertyType | null;
  ownershipStatus?: OwnershipStatus | null;
  originalDocuments?: boolean | null;
  loanAmountInr?: number | null;
  occupation?: OccupationType | null;
  incomeMode?: IncomeMode | null;
  marketValueInr?: number | null;
  tenureYears?: number | null;
  existingPropertyLoan?: boolean | null;
  emiReductionRequested?: boolean | null;
  callbackTime?: string | null;
  customerDeclined?: boolean | null;
  maxAmountAccepted?: boolean | null;
  isBusy?: boolean | null;
  isCustomerConfirmed?: boolean | null;
}

export interface LLMExtractionResult {
  intent: 'greeting' | 'eligibility_answer' | 'diversion_question' | 'busy' | 'decline' | 'transfer_request' | 'clarification_response' | 'correction' | 'other';
  facts: ExtractedFacts;
  clarificationNeeded: boolean;
  clarificationQuestion?: string | null;
  conversationalResponse?: string;
}

export interface ProcessMessageResponse {
  conversationId: string;
  assistantResponse: string;
  stage: ConversationStage;
  checklist: EligibilityChecklist;
  nextMissingQuestion: string | null;
  overallEligibility: 'PENDING' | 'ELIGIBLE' | 'DISQUALIFIED' | 'SPECIALIST_TRANSFER';
  finalOutcome: FinalOutcome | null;
  routingReason: string | null;
  disqualificationReason: string | null;
  turnCount: number;
  transcript: TranscriptMessage[];
  state?: ConversationState;
  usedLLM: boolean;
  llmModel?: string;
  error?: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: 'eligibility' | 'disqualification' | 'transfer' | 'edge_case' | 'dialogue';
  script: Array<{ role: 'customer'; text: string }>;
  expectedOutcome: FinalOutcome;
  expectedDisqualificationReason?: string;
  expectedStateAssertions: (state: ConversationState) => { pass: boolean; details: string };
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  expectedOutcome: FinalOutcome;
  actualOutcome: FinalOutcome | null;
  details: string;
  executionTimeMs: number;
  state: ConversationState;
  transcript: TranscriptMessage[];
  isLiveLLM?: boolean;
}
