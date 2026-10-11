/**
 * OpenRouter Service Module
 * Handles Chat Completions, public models listing, connection testing, and error management.
 */

import { z } from 'zod';
import { LLMExtractionResult, OpenRouterConfig } from '../types.js';

// Structured Output Extraction Schema via Zod
export const ExtractedFactsZodSchema = z.object({
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL']).nullable().optional(),
  ownershipStatus: z.enum(['SOLE', 'JOINT']).nullable().optional(),
  originalDocuments: z.boolean().nullable().optional(),
  loanAmountInr: z.number().nullable().optional(),
  occupation: z.enum(['SALARIED', 'SELF_EMPLOYED']).nullable().optional(),
  incomeMode: z.enum(['BANK', 'CASH']).nullable().optional(),
  marketValueInr: z.number().nullable().optional(),
  tenureYears: z.number().nullable().optional(),
  existingPropertyLoan: z.boolean().nullable().optional(),
  emiReductionRequested: z.boolean().nullable().optional(),
  callbackTime: z.string().nullable().optional(),
  customerDeclined: z.boolean().nullable().optional(),
  maxAmountAccepted: z.boolean().nullable().optional(),
  isBusy: z.boolean().nullable().optional(),
  isCustomerConfirmed: z.boolean().nullable().optional(),
});

export const LLMExtractionZodSchema = z.object({
  intent: z.enum([
    'greeting',
    'eligibility_answer',
    'diversion_question',
    'busy',
    'decline',
    'transfer_request',
    'clarification_response',
    'correction',
    'other'
  ]),
  facts: ExtractedFactsZodSchema,
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().nullable().optional(),
  conversationalResponse: z.string().optional(),
});

export class OpenRouterService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config?: Partial<OpenRouterConfig>) {
    this.apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = config?.model || process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
    this.baseUrl = config?.baseUrl || 'https://openrouter.ai/api/v1';
  }

  public getConfig(): { isConfigured: boolean; model: string; maskedKey: string } {
    const isConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 0);
    const maskedKey = isConfigured
      ? `${this.apiKey.substring(0, 7)}...${this.apiKey.substring(this.apiKey.length - 4)}`
      : 'Not Configured';

    return {
      isConfigured,
      model: this.model,
      maskedKey
    };
  }

  public updateConfig(apiKey?: string, model?: string) {
    if (apiKey !== undefined) this.apiKey = apiKey.trim();
    if (model !== undefined) this.model = model.trim();
  }

  /**
   * Test the connection to OpenRouter with configured API key and model
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    model: string;
    latencyMs?: number;
    errorType?: 'MISSING_KEY' | 'AUTH_ERROR' | 'INSUFFICIENT_CREDITS' | 'MODEL_UNAVAILABLE' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'UNKNOWN';
  }> {
    if (!this.apiKey || !this.apiKey.trim()) {
      return {
        success: false,
        message: 'OpenRouter API Key is not configured. Please set OPENROUTER_API_KEY in the .env file.',
        model: this.model,
        errorType: 'MISSING_KEY'
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Home Credit AI Voice Agent'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'user', content: 'Respond with exactly: {"status":"connected"}' }
          ],
          max_tokens: 30,
          temperature: 0.1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        let parsedMessage = errorBody;
        try {
          const jsonErr = JSON.parse(errorBody);
          parsedMessage = jsonErr.error?.message || jsonErr.message || errorBody;
        } catch {
          // ignore json parse error
        }

        if (response.status === 401) {
          return {
            success: false,
            message: `Authentication failed (401): ${parsedMessage}. Check that your OPENROUTER_API_KEY is valid.`,
            model: this.model,
            errorType: 'AUTH_ERROR'
          };
        } else if (response.status === 402) {
          return {
            success: false,
            message: `Insufficient credits or quota (402): ${parsedMessage}. Check your OpenRouter credit balance.`,
            model: this.model,
            errorType: 'INSUFFICIENT_CREDITS'
          };
        } else if (response.status === 404) {
          return {
            success: false,
            message: `Model not found (404): ${parsedMessage}. The model '${this.model}' may not be supported or available.`,
            model: this.model,
            errorType: 'MODEL_UNAVAILABLE'
          };
        } else if (response.status === 429) {
          return {
            success: false,
            message: `Rate limit reached (429): ${parsedMessage}.`,
            model: this.model,
            errorType: 'RATE_LIMITED'
          };
        }

        return {
          success: false,
          message: `OpenRouter returned HTTP ${response.status}: ${parsedMessage}`,
          model: this.model,
          errorType: 'UNKNOWN'
        };
      }

      return {
        success: true,
        message: `Successfully connected to OpenRouter using model '${this.model}'!`,
        model: this.model,
        latencyMs
      };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        success: false,
        message: isAbort ? 'Connection timed out after 12 seconds.' : `Network error: ${err.message}`,
        model: this.model,
        errorType: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Fetch list of public models from OpenRouter (No API key required)
   */
  public async getAvailableModels(): Promise<Array<{ id: string; name: string; context_length?: number; pricing?: any }>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.baseUrl}/models`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching models`);
      }

      const data = (await response.json()) as any;
      if (Array.isArray(data.data)) {
        return data.data.slice(0, 50).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length,
          pricing: m.pricing
        }));
      }
      return [];
    } catch {
      // Fallback list of well-known popular OpenRouter models
      return [
        { id: 'google/gemini-2.0-flash-001', name: 'Google: Gemini 2.0 Flash' },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct' },
        { id: 'anthropic/claude-3.5-haiku', name: 'Anthropic: Claude 3.5 Haiku' },
        { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini' },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek: DeepSeek V3' },
      ];
    }
  }

  /**
   * Call OpenRouter Chat Completions for Extraction and Conversational Response
   */
  public async extractAndRespond(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    customerUtterance: string,
    language: 'en-IN' | 'hi-IN' = 'en-IN'
  ): Promise<LLMExtractionResult> {
    if (!this.apiKey || !this.apiKey.trim()) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const languageInstruction = language === 'hi-IN'
      ? `CRITICAL LANGUAGE REQUIREMENT (HIGHEST PRIORITY):
The customer has selected HINDI (hi-IN) as their language.
You MUST write "conversationalResponse" and "clarificationQuestion" STRICTLY, EXPLICITLY, AND ONLY in natural spoken Hindi using Devanagari script (हिंदी).
DO NOT respond in English or Latin/Roman script. The agent must speak Hindi to the customer.
Example conversationalResponse in Hindi: "जी बहुत बढ़िया। क्या इस आवासीय संपत्ति के मूल दस्तावेज़ आपके पास उपलब्ध हैं?"`
      : `LANGUAGE REQUIREMENT:
The customer has selected English (en-IN). Write "conversationalResponse" and "clarificationQuestion" in professional, polite Indian English.`;

    const schemaDescription = `
You must respond ONLY with a valid JSON object strictly matching this schema:
{
  "intent": "greeting" | "eligibility_answer" | "diversion_question" | "busy" | "decline" | "transfer_request" | "clarification_response" | "correction" | "other",
  "facts": {
    "propertyType": "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "AGRICULTURAL" | null,
    "ownershipStatus": "SOLE" | "JOINT" | null,
    "originalDocuments": boolean | null,
    "loanAmountInr": number | null,
    "occupation": "SALARIED" | "SELF_EMPLOYED" | null,
    "incomeMode": "BANK" | "CASH" | null,
    "marketValueInr": number | null,
    "tenureYears": number | null,
    "existingPropertyLoan": boolean | null,
    "emiReductionRequested": boolean | null,
    "callbackTime": string | null,
    "customerDeclined": boolean | null,
    "maxAmountAccepted": boolean | null,
    "isBusy": boolean | null,
    "isCustomerConfirmed": boolean | null
  },
  "clarificationNeeded": boolean,
  "clarificationQuestion": string | null,
  "conversationalResponse": string
}
CRITICAL RULES:
1. Normalize Indian currency numbers (e.g., "50 lakhs" -> 5000000, "1 crore" -> 10000000, "पचास लाख" -> 5000000, "एक करोड़" -> 10000000).
2. Extract multiple facts if the customer provided them in one go.
3. If customer corrects an answer, extract the new value.
4. conversationalResponse must be concise (1 to 2 sentences max) suitable for text-to-speech vocalization.
5. Do not invent interest rates or loan approvals.
${languageInstruction}
`;

    const messages = [
      { role: 'system', content: `${systemPrompt}\n\n${schemaDescription}` },
      ...conversationHistory.slice(-8), // Keep relevant recent context
      { role: 'user', content: customerUtterance }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Home Credit AI Voice Agent'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
      }

      const responseData = (await response.json()) as any;
      const rawContent = responseData.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Empty response content received from OpenRouter');
      }

      // Clean markdown code blocks if model wrapped JSON in ```json
      let cleanedJson = rawContent.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      const parsedJson = JSON.parse(cleanedJson);
      const validated = LLMExtractionZodSchema.parse(parsedJson);
      return validated as LLMExtractionResult;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter request timed out after 18 seconds');
      }
      throw error;
    }
  }
}
