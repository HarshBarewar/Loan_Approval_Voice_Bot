/**
 * Express REST API Integration Tests
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Express REST API Endpoints', () => {
  it('GET /api/health returns 200 and ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Home Credit');
  });

  it('GET /api/config/status returns OpenRouter config metadata without exposing secrets', async () => {
    const res = await request(app).get('/api/config/status');
    expect(res.status).toBe(200);
    expect(res.body.openRouter).toBeDefined();
    expect(res.body.openRouter.model).toBeDefined();
    // Key must never be raw
    expect(res.body.openRouter.apiKey).toBeUndefined();
  });

  it('POST /api/conversations initializes a new conversation', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({ customerName: 'Rajesh Kumar' });

    expect(res.status).toBe(201);
    expect(res.body.conversationId).toBeDefined();
    expect(res.body.state.customerName).toBe('Rajesh Kumar');
    expect(res.body.initialMessage).toContain('Home Credit');
  });

  it('POST /api/conversations/:id/messages handles message processing', async () => {
    const createRes = await request(app).post('/api/conversations').send({});
    const convId = createRes.body.conversationId;

    const msgRes = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .send({ message: 'It is a residential flat', forceScripted: true });

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.checklist.propertyType.value).toBe('RESIDENTIAL');
    expect(msgRes.body.assistantResponse).toBeDefined();
  });

  it('GET /api/scenarios lists all predefined test scenarios', async () => {
    const res = await request(app).get('/api/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.scenarios.length).toBeGreaterThanOrEqual(16);
  });

  it('POST /api/scenarios/run-all executes all scenarios successfully', async () => {
    const res = await request(app)
      .post('/api/scenarios/run-all')
      .send({ useLiveLLM: false });

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(16);
    expect(res.body.passed).toBe(res.body.total);
    expect(res.body.passRate).toBe(100);
  });
});
