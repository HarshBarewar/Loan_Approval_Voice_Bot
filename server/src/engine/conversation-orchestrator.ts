/**
 * Conversation Orchestrator
 * Central pipeline integrating NLP, State Machine, Business Rules, and OpenRouter LLM.
 */

import fs from 'fs';
import path from 'path';
import {
  ConversationStage,
  ConversationState,
  FinalOutcome,
  ProcessMessageResponse,
  TranscriptMessage
} from '../types.js';
import { NLPExtractor } from './nlp-extractor.js';
import { RuleEvaluator } from './rule-evaluator.js';
import { StateMachine } from './state-machine.js';
import { OpenRouterService } from '../services/openrouter.js';

export class ConversationOrchestrator {
  private openRouterService: OpenRouterService;
  private systemPrompt: string = '';
  private productKnowledge: string = '';

  constructor(openRouterService: OpenRouterService) {
    this.openRouterService = openRouterService;
    this.loadPromptsAndKnowledge();
  }

  private loadPromptsAndKnowledge() {
    try {
      const promptPath = path.resolve(process.cwd(), 'server', 'prompts', 'home-credit-agent.md');
      if (fs.existsSync(promptPath)) {
        this.systemPrompt = fs.readFileSync(promptPath, 'utf8');
      } else {
        // Fallback relative path check
        const altPath = path.resolve(process.cwd(), 'prompts', 'home-credit-agent.md');
        if (fs.existsSync(altPath)) {
          this.systemPrompt = fs.readFileSync(altPath, 'utf8');
        }
      }
    } catch {
      this.systemPrompt = 'You are a Home Credit LAP qualification assistant.';
    }

    try {
      const knowledgePath = path.resolve(process.cwd(), 'server', 'knowledge', 'home-credit-product.md');
      if (fs.existsSync(knowledgePath)) {
        this.productKnowledge = fs.readFileSync(knowledgePath, 'utf8');
      } else {
        const altPath = path.resolve(process.cwd(), 'knowledge', 'home-credit-product.md');
        if (fs.existsSync(altPath)) {
          this.productKnowledge = fs.readFileSync(altPath, 'utf8');
        }
      }
    } catch {
      this.productKnowledge = '';
    }
  }

  /**
   * Process a customer message in an ongoing conversation
   */
  public async processMessage(
    currentState: ConversationState,
    transcript: TranscriptMessage[],
    customerMessage: string,
    forceScripted: boolean = false
  ): Promise<ProcessMessageResponse> {
    const trimmedMessage = customerMessage.trim();
    if (!trimmedMessage) {
      throw new Error('Customer message cannot be empty.');
    }

    // 1. Guard against continuing an already terminated conversation
    if (
      currentState.stage === ConversationStage.DISQUALIFIED ||
      currentState.stage === ConversationStage.QUALIFIED_FOR_HUMAN_HANDOFF ||
      currentState.stage === ConversationStage.TRANSFER_SPECIALIST_REQUIRED ||
      currentState.stage === ConversationStage.CALLBACK_REQUESTED ||
      currentState.stage === ConversationStage.DECLINED ||
      currentState.finalOutcome !== null
    ) {
      const isHindi = currentState.language === 'hi-IN';
      const responseText = isHindi
        ? 'यह बातचीत समाप्त हो चुकी है। नई पात्रता जांच शुरू करने के लिए कृपया एक नई कॉल शुरू करें।'
        : 'This conversation has already concluded. Please start a new conversation to begin a new qualification check.';
      return {
        conversationId: currentState.conversationId,
        assistantResponse: responseText,
        stage: currentState.stage,
        checklist: currentState.checklist,
        nextMissingQuestion: null,
        overallEligibility: currentState.overallEligibility,
        finalOutcome: currentState.finalOutcome,
        routingReason: currentState.routingReason,
        disqualificationReason: currentState.disqualificationReason,
        turnCount: currentState.turnCount,
        transcript,
        usedLLM: false
      };
    }

    // 2. Add Customer Message to Transcript
    const now = new Date().toISOString();
    const customerTurnMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: currentState.conversationId,
      sender: 'customer',
      text: trimmedMessage,
      timestamp: now,
      stageAtTurn: currentState.stage
    };
    const updatedTranscript = [...transcript, customerTurnMsg];

    // 3. NLP Rule Extraction (Always performed as reliable baseline)
    const ruleExtractedFacts = NLPExtractor.extractFacts(trimmedMessage, currentState);

    let mergedFacts = { ...ruleExtractedFacts };
    let llmResponseText: string | null = null;
    let usedLLM = false;
    let llmModelName: string | undefined;

    // 4. Check if LLM should and can be called
    const config = this.openRouterService.getConfig();
    if (config.isConfigured && !forceScripted) {
      try {
        const historyForLLM: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          { role: 'system', content: `Product Knowledge:\n${this.productKnowledge}` },
          ...transcript.slice(-6).map(m => ({
            role: (m.sender === 'customer' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.text
          }))
        ];

        const llmResult = await this.openRouterService.extractAndRespond(
          this.systemPrompt,
          historyForLLM,
          trimmedMessage,
          currentState.language || 'en-IN'
        );

        usedLLM = true;
        llmModelName = config.model;

        // Merge facts safely, prioritizing validated non-null fields
        if (llmResult.facts) {
          mergedFacts = {
            ...mergedFacts,
            ...(llmResult.facts.propertyType && { propertyType: llmResult.facts.propertyType }),
            ...(llmResult.facts.ownershipStatus && { ownershipStatus: llmResult.facts.ownershipStatus }),
            ...(llmResult.facts.originalDocuments !== undefined && llmResult.facts.originalDocuments !== null && { originalDocuments: llmResult.facts.originalDocuments }),
            ...(llmResult.facts.loanAmountInr && { loanAmountInr: llmResult.facts.loanAmountInr }),
            ...(llmResult.facts.occupation && { occupation: llmResult.facts.occupation }),
            ...(llmResult.facts.incomeMode && { incomeMode: llmResult.facts.incomeMode }),
            ...(llmResult.facts.marketValueInr && { marketValueInr: llmResult.facts.marketValueInr }),
            ...(llmResult.facts.tenureYears && { tenureYears: llmResult.facts.tenureYears }),
            ...(llmResult.facts.existingPropertyLoan !== undefined && llmResult.facts.existingPropertyLoan !== null && { existingPropertyLoan: llmResult.facts.existingPropertyLoan }),
            ...(llmResult.facts.emiReductionRequested !== undefined && llmResult.facts.emiReductionRequested !== null && { emiReductionRequested: llmResult.facts.emiReductionRequested }),
            ...(llmResult.facts.callbackTime && { callbackTime: llmResult.facts.callbackTime }),
            ...(llmResult.facts.customerDeclined !== undefined && llmResult.facts.customerDeclined !== null && { customerDeclined: llmResult.facts.customerDeclined }),
          };
        }

        if (llmResult.conversationalResponse) {
          llmResponseText = llmResult.conversationalResponse.trim();
        }
      } catch (llmError: any) {
        // Safe recovery without crashing or falsely approving
        usedLLM = false;
        console.warn('OpenRouter LLM extraction encountered error, falling back to deterministic engine:', llmError.message);
      }
    }

    // 5. Special Edge Cases:
    const isHindi = currentState.language === 'hi-IN';

    // A. Ambiguous Documents: "The documents should be somewhere"
    if (NLPExtractor.isAmbiguousDocuments(trimmedMessage) && mergedFacts.originalDocuments === undefined) {
      const response = isHindi
        ? 'पात्र होने के लिए सत्यापन हेतु मूल संपत्ति दस्तावेज़ (ओरिजिनल पेपर्स) उपलब्ध होने चाहिए। क्या आप पुष्टि कर सकते हैं कि मूल दस्तावेज़ उपलब्ध कराए जा सकते हैं?'
        : 'To qualify, original title deeds must be readily available for physical verification. Could you confirm whether the original documents can be provided?';
      const agentTurn: TranscriptMessage = {
        id: `msg-${Date.now()}-agent`,
        conversationId: currentState.conversationId,
        sender: 'agent',
        text: response,
        timestamp: new Date().toISOString(),
        stageAtTurn: ConversationStage.CLARIFICATION
      };
      return {
        conversationId: currentState.conversationId,
        assistantResponse: response,
        stage: ConversationStage.CLARIFICATION,
        checklist: currentState.checklist,
        nextMissingQuestion: currentState.nextMissingQuestion,
        overallEligibility: currentState.overallEligibility,
        finalOutcome: currentState.finalOutcome,
        routingReason: currentState.routingReason,
        disqualificationReason: currentState.disqualificationReason,
        turnCount: currentState.turnCount + 1,
        transcript: [...updatedTranscript, agentTurn],
        usedLLM
      };
    }

    // B. Interest Rate Diversion Question
    if (NLPExtractor.isInterestRateQuestion(trimmedMessage)) {
      const nextQ = RuleEvaluator.getNextMissingQuestion(currentState.checklist, currentState.language || 'en-IN') || '';
      const response = isHindi
        ? `हमारी ब्याज दरें प्रत्येक संपत्ति प्रोफाइल के अनुसार तय होती हैं। प्रारंभिक पात्रता के बाद हमारे वरिष्ठ लोन विशेषज्ञ आपको सटीक ब्याज दर और शर्तें बताएंगे। ${nextQ}`
        : `Our interest rates are tailored to each property profile. A senior loan expert will provide the exact rate and terms after preliminary qualification. ${nextQ}`;
      const agentTurn: TranscriptMessage = {
        id: `msg-${Date.now()}-agent`,
        conversationId: currentState.conversationId,
        sender: 'agent',
        text: response,
        timestamp: new Date().toISOString(),
        stageAtTurn: currentState.stage
      };
      return {
        conversationId: currentState.conversationId,
        assistantResponse: response,
        stage: currentState.stage,
        checklist: currentState.checklist,
        nextMissingQuestion: currentState.nextMissingQuestion,
        overallEligibility: currentState.overallEligibility,
        finalOutcome: currentState.finalOutcome,
        routingReason: currentState.routingReason,
        disqualificationReason: currentState.disqualificationReason,
        turnCount: currentState.turnCount + 1,
        transcript: [...updatedTranscript, agentTurn],
        usedLLM
      };
    }

    // C. Unrelated Question
    if (NLPExtractor.isUnrelatedQuestion(trimmedMessage)) {
      const nextQ = RuleEvaluator.getNextMissingQuestion(currentState.checklist, currentState.language || 'en-IN') || '';
      const response = isHindi
        ? `मैं होम क्रेडिट से एक एआई वॉयस असिस्टेंट हूँ, जो आपके प्री-अप्रूव्ड लोन अगेंस्ट प्रॉपर्टी ऑफर के संबंध में बात कर रही हूँ। ${nextQ}`
        : `I am an AI assistant with Home Credit calling regarding your pre-approved Loan Against Property offer. ${nextQ}`;
      const agentTurn: TranscriptMessage = {
        id: `msg-${Date.now()}-agent`,
        conversationId: currentState.conversationId,
        sender: 'agent',
        text: response,
        timestamp: new Date().toISOString(),
        stageAtTurn: currentState.stage
      };
      return {
        conversationId: currentState.conversationId,
        assistantResponse: response,
        stage: currentState.stage,
        checklist: currentState.checklist,
        nextMissingQuestion: currentState.nextMissingQuestion,
        overallEligibility: currentState.overallEligibility,
        finalOutcome: currentState.finalOutcome,
        routingReason: currentState.routingReason,
        disqualificationReason: currentState.disqualificationReason,
        turnCount: currentState.turnCount + 1,
        transcript: [...updatedTranscript, agentTurn],
        usedLLM
      };
    }

    // 6. Update State Machine
    let nextState = StateMachine.applyFacts(currentState, mergedFacts);
    nextState.turnCount += 1;

    // Check Loan Cap Alternative offer: if user requested > 75L and hasn't yet responded to cap
    if (
      nextState.checklist.desiredLoanAmount.value !== null &&
      nextState.checklist.desiredLoanAmount.value > RuleEvaluator.MAX_LOAN_AMOUNT &&
      nextState.maxAmountCapAccepted === null &&
      !nextState.maxAmountCapOffered
    ) {
      nextState.maxAmountCapOffered = true;
      const response = isHindi
        ? 'इस विशेष योजना के तहत हमारी अधिकतम लोन राशि ₹75 लाख है। क्या आप ₹75 लाख के साथ आगे बढ़ना चाहेंगे?'
        : 'Under this specific scheme, our maximum loan amount is ₹75 Lakhs. Would you like to proceed with ₹75 Lakhs instead?';
      const capQuestion = isHindi
        ? 'क्या आप ₹75 लाख के साथ आगे बढ़ना चाहेंगे?'
        : 'Would you like to proceed with ₹75 Lakhs?';
      const agentTurn: TranscriptMessage = {
        id: `msg-${Date.now()}-agent`,
        conversationId: nextState.conversationId,
        sender: 'agent',
        text: response,
        timestamp: new Date().toISOString(),
        stageAtTurn: nextState.stage
      };
      return {
        conversationId: nextState.conversationId,
        assistantResponse: response,
        stage: nextState.stage,
        checklist: nextState.checklist,
        nextMissingQuestion: capQuestion,
        overallEligibility: 'PENDING',
        finalOutcome: null,
        routingReason: null,
        disqualificationReason: null,
        turnCount: nextState.turnCount,
        transcript: [...updatedTranscript, agentTurn],
        usedLLM
      };
    }

    // 7. Transition State based on deterministic business rules
    nextState = StateMachine.transition(nextState);

    // 8. Generate Final Conversational Response based on State
    const assistantResponse = this.generateResponse(nextState, llmResponseText);

    // Record agent message
    const agentTurnMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: nextState.conversationId,
      sender: 'agent',
      text: assistantResponse,
      timestamp: new Date().toISOString(),
      stageAtTurn: nextState.stage,
      capturedFacts: mergedFacts
    };
    const finalTranscript = [...updatedTranscript, agentTurnMsg];

    return {
      conversationId: nextState.conversationId,
      assistantResponse,
      stage: nextState.stage,
      checklist: nextState.checklist,
      nextMissingQuestion: nextState.nextMissingQuestion,
      overallEligibility: nextState.overallEligibility,
      finalOutcome: nextState.finalOutcome,
      routingReason: nextState.routingReason,
      disqualificationReason: nextState.disqualificationReason,
      turnCount: nextState.turnCount,
      transcript: finalTranscript,
      state: nextState,
      usedLLM,
      llmModel: llmModelName
    };
  }

  /**
   * Deterministic conversational response generator aligned with strict rules
   */
  private generateResponse(state: ConversationState, llmSuggestion?: string | null): string {
    const isHindi = state.language === 'hi-IN';

    // Stage-specific deterministic responses guarantees compliance with rules
    if (state.stage === ConversationStage.CALLBACK_REQUESTED) {
      return isHindi
        ? `धन्यवाद। मैंने ${state.callbackTime || 'सुविधाजनक समय'} के लिए आपका कॉलबैक अनुरोध दर्ज कर लिया है। होम क्रेडिट के प्रतिनिधि उस समय आपसे संपर्क करेंगे। आपका दिन शुभ हो!`
        : `Thank you. I have recorded your callback preference for ${state.callbackTime || 'a convenient time'}. A Home Credit representative will connect with you then. Have a great day!`;
    }

    if (state.stage === ConversationStage.DECLINED) {
      return isHindi
        ? 'मैं पूरी तरह समझती हूँ। होम क्रेडिट को समय देने के लिए धन्यवाद। भविष्य में यदि आपको वित्तीय सहायता की आवश्यकता हो, तो कृपया हमसे संपर्क करें।'
        : 'I completely understand. Thank you for your time with Home Credit. Please reach out to us if your financing needs change in the future.';
    }

    if (state.stage === ConversationStage.TRANSFER_SPECIALIST_REQUIRED) {
      return isHindi
        ? 'चूँकि आपकी संपत्ति पर पहले से लोन है या आप ईएमआई कम कराना चाहते हैं, इसलिए हमारी लोन ट्रांसफर स्पेशलिस्ट टीम आपके मामले को संभालेगी। हमारे विशेषज्ञ शीघ्र ही आपसे संपर्क करेंगे।'
        : 'Since you have an existing loan on this property or are looking for an EMI reduction, our Loan Transfer Specialist team will handle your request. A specialist is expected to contact you shortly.';
    }

    if (state.finalOutcome === FinalOutcome.MAXIMUM_AMOUNT_NOT_ACCEPTED) {
      return isHindi
        ? 'समझ गई। चूँकि 75 लाख रुपये आपकी आवश्यकता पूरी नहीं करते, इसलिए हम आज इस विशेष ऑफर के साथ आगे नहीं बढ़ सकते। होम क्रेडिट को समय देने के लिए धन्यवाद।'
        : 'Understood. Since ₹75 Lakhs does not meet your requirements, we cannot proceed with this specific offer today. Thank you for your time with Home Credit.';
    }

    if (state.stage === ConversationStage.DISQUALIFIED) {
      if (isHindi) {
        let reasonHindi = 'पात्रता शर्तें पूरी न होने के कारण';
        const reasonLower = (state.disqualificationReason || '').toLowerCase();
        if (reasonLower.includes('agricultural')) {
          reasonHindi = 'कृषि भूमि इस योजना के तहत मान्य नहीं है, केवल आवासीय, व्यावसायिक या औद्योगिक संपत्ति स्वीकार्य है';
        } else if (reasonLower.includes('original')) {
          reasonHindi = 'सत्यापन के लिए मूल दस्तावेज़ (ओरिजिनल पेपर्स) होना अनिवार्य है';
        } else if (reasonLower.includes('cash')) {
          reasonHindi = 'मासिक आय बैंक खाते में प्राप्त होना अनिवार्य है';
        } else if (reasonLower.includes('tenure')) {
          reasonHindi = 'लोन अवधि 3 से 15 वर्ष के बीच होना अनिवार्य है';
        }
        return `विवरण साझा करने के लिए धन्यवाद। खेद है कि हमारी नीति के अनुसार (${reasonHindi}), हम आज इस लोन ऑफर के साथ आगे नहीं बढ़ सकते।`;
      }
      return `Thank you for sharing the details. Unfortunately, based on our policy criteria (${state.disqualificationReason || 'criteria not met'}), we cannot proceed with this loan offer today.`;
    }

    if (state.stage === ConversationStage.QUALIFIED_FOR_HUMAN_HANDOFF) {
      return isHindi
        ? 'बधाई हो! आपने हमारे होम क्रेडिट लोन अगेंस्ट प्रॉपर्टी के लिए सभी प्रारंभिक पात्रता शर्तें पूरी कर ली हैं। हमारे वरिष्ठ लोन विशेषज्ञ आपसे व्यक्तिगत ब्याज दरों और दस्तावेज़ीकरण के लिए शीघ्र संपर्क करेंगे।'
        : 'Congratulations! You have completed the preliminary qualification for our Home Credit Loan Against Property. A senior loan expert will contact you shortly to discuss personalized interest rates and documentation.';
    }

    // Ongoing qualification:
    // If language is Hindi, verify the LLM suggestion is actually in Hindi Devanagari script
    if (isHindi) {
      const containsDevanagari = llmSuggestion && /[\u0900-\u097F]/.test(llmSuggestion);
      if (containsDevanagari && state.nextMissingQuestion && llmSuggestion!.includes('?')) {
        return llmSuggestion!;
      }
      return state.nextMissingQuestion || 'धन्यवाद। मैं अगले विवरण की जाँच करती हूँ।';
    }

    // English ongoing qualification
    if (llmSuggestion && state.nextMissingQuestion && llmSuggestion.includes('?')) {
      return llmSuggestion;
    }

    // Default template for next unanswered question
    return state.nextMissingQuestion || 'Thank you for your response. Let me check the next detail.';
  }
}
