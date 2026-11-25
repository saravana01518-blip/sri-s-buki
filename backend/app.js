const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { isDatabaseConnected } = require('./config/db');
const { createQueryRouter } = require('./routes/query');
const { requireAuth } = require('./middleware/auth');
const { SageServiceError } = require('./services/sageConnector');
const { defaultBukiClient, BukiClientError } = require('./services/bukiClient');

/**
 * Builds the Express application with injectable dependencies for clean testing.
 */
function createApp({ authMiddleware, sageConnector, bukiClient = defaultBukiClient } = {}) {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '100kb' }));

  // Catch malformed JSON request bodies before routes execute.
  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Malformed JSON in request body.',
        },
      });
    }
    return next(err);
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'buki-sage-backend',
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
      sageMode: (sageConnector?.mockMode ?? config.sageMockMode) ? 'mock' : 'live',
      timeoutMs: sageConnector?.timeoutMs ?? config.sageTimeoutMs,
      bukiUrl: bukiClient?.baseUrl || config.bukiUrl,
      bukiTokenConfigured: Boolean(bukiClient?.apiToken || config.bukiApiToken),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/buki/health', authMiddleware || requireAuth, async (_req, res, next) => {
    try {
      const upstream = await bukiClient.checkHealth();
      return res.status(200).json({
        ok: true,
        target: bukiClient.baseUrl,
        upstream,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.use('/api/query', createQueryRouter({ authMiddleware, sageConnector }));

  app.use('/api', (_req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
      },
    });
  });

  const frontendDistDir = path.resolve(__dirname, '../frontend/dist');
  const frontendIndexFile = path.join(frontendDistDir, 'index.html');

  if (fs.existsSync(frontendIndexFile)) {
    app.use(express.static(frontendDistDir));
    app.get('*', (_req, res) => {
      res.status(200).sendFile(frontendIndexFile);
    });
  } else {
    app.get('/', (_req, res) => {
      res.status(200).json({
        ok: true,
        service: 'buki-sage-backend',
        health: '/api/health',
      });
    });

    app.use((_req, res) => {
      res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found.',
        },
      });
    });
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof SageServiceError || err instanceof BukiClientError) {
      return res.status(err.statusCode).json({
        ok: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    console.error('[server] Unhandled error:', err);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    });
  });

  return app;
}

module.exports = {
  createApp,
};
