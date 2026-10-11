/**
 * OpenRouter Service Unit & Integration Tests (Mocked)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterService, LLMExtractionZodSchema } from '../src/services/openrouter.js';

describe('OpenRouter Service Integration', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports missing API key correctly when tested', async () => {
    const service = new OpenRouterService({ apiKey: '', model: 'test' });
    const result = await service.testConnection();

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('MISSING_KEY');
    expect(result.message).toContain('not configured');
  });

  it('handles 401 Authentication Failure from OpenRouter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'Invalid API key provided' } })
    } as any);

    const service = new OpenRouterService({ apiKey: 'sk-or-invalid', model: 'test' });
    const result = await service.testConnection();

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('AUTH_ERROR');
    expect(result.message).toContain('Authentication failed');
  });

  it('handles 402 Insufficient Credits from OpenRouter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => JSON.stringify({ error: { message: 'Insufficient credits on account' } })
    } as any);

    const service = new OpenRouterService({ apiKey: 'sk-or-valid-but-empty', model: 'test' });
    const result = await service.testConnection();

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('INSUFFICIENT_CREDITS');
    expect(result.message).toContain('Insufficient credits');
  });

  it('handles 429 Rate Limiting from OpenRouter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'Rate limit exceeded' } })
    } as any);

    const service = new OpenRouterService({ apiKey: 'sk-or-valid', model: 'test' });
    const result = await service.testConnection();

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('RATE_LIMITED');
  });

  it('successfully parses valid structured JSON response from OpenRouter', async () => {
    const mockModelPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'eligibility_answer',
              facts: {
                propertyType: 'RESIDENTIAL',
                ownershipStatus: 'SOLE',
                originalDocuments: true,
                loanAmountInr: 5000000,
                occupation: 'SALARIED',
                incomeMode: 'BANK',
                marketValueInr: 10000000,
                tenureYears: 10,
                existingPropertyLoan: false,
                emiReductionRequested: false
              },
              clarificationNeeded: false,
              conversationalResponse: 'Thank you for providing that detail.'
            })
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelPayload
    } as any);

    const service = new OpenRouterService({ apiKey: 'sk-or-valid', model: 'google/gemini-2.0-flash-001' });
    const result = await service.extractAndRespond(
      'System Prompt',
      [],
      'Residential house, sole owner, 50 lakhs'
    );

    expect(result.intent).toBe('eligibility_answer');
    expect(result.facts.propertyType).toBe('RESIDENTIAL');
    expect(result.facts.loanAmountInr).toBe(5000000);
    expect(result.conversationalResponse).toBe('Thank you for providing that detail.');
  });

  it('validates schema and rejects malformed fields cleanly', () => {
    const invalidObj = {
      intent: 'not_a_valid_intent', // Invalid enum
      facts: {},
      clarificationNeeded: false
    };

    const parseResult = LLMExtractionZodSchema.safeParse(invalidObj);
    expect(parseResult.success).toBe(false);
  });
});
