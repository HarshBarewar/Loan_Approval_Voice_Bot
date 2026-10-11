/**
 * Home Credit AI Voice Agent — Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { OpenRouterService } from './services/openrouter.js';
import { ConversationOrchestrator } from './engine/conversation-orchestrator.js';
import { createApiRouter } from './routes/api.js';

// Load environment variables from .env if present
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));

// Initialize Services
const openRouterService = new OpenRouterService();
const orchestrator = new ConversationOrchestrator(openRouterService);

// Mount API Router
app.use('/api', createApiRouter(openRouterService, orchestrator));

// Root info route
app.get('/', (_req, res) => {
  res.json({
    name: 'Home Credit AI Voice Agent Server',
    status: 'running',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Central Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Server if not run in test environment or Vercel serverless function
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    const config = openRouterService.getConfig();
    console.log(`=======================================================`);
    console.log(`🚀 Home Credit AI Voice Agent Backend`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🤖 OpenRouter Status: ${config.isConfigured ? 'CONFIGURED (' + config.model + ')' : 'NOT CONFIGURED (Using local fallback engine)'}`);
    console.log(`=======================================================`);
  });
}

export default app;
