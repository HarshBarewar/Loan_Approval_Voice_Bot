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

export interface EligibilityField<T> {
  value: T | null;
  status: FieldStatus;
  rawAnswer?: string;
  capturedAt?: string;
}

export interface EligibilityChecklist {
  propertyType: EligibilityField<string>;
  ownershipStatus: EligibilityField<string>;
  originalDocuments: EligibilityField<boolean>;
  desiredLoanAmount: EligibilityField<number>;
  occupation: EligibilityField<string>;
  incomeMode: EligibilityField<string>;
  marketValue: EligibilityField<number>;
  desiredTenureYears: EligibilityField<number>;
}

export interface ConversationState {
  conversationId: string;
  stage: ConversationStage;
  customerName: string;
  agentName: string;
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

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  expectedOutcome: FinalOutcome;
  turnCount: number;
  initialUtterance?: string;
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

export interface SavedConversation {
  id: string;
  customerName: string;
  state: ConversationState;
  transcript: TranscriptMessage[];
  durationSeconds: number;
  savedAt: string;
}
