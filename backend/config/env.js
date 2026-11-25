const dotenv = require('dotenv');

dotenv.config();

/**
 * Parses a positive integer environment variable with a safe fallback.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const config = {
  port: parsePositiveInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  bukiApiToken: process.env.BUKI_API_TOKEN || '',
  sageApiUrl: process.env.SAGE_API_URL || '',
  sageApiKey: process.env.SAGE_API_KEY || '',
  sageTimeoutMs: parsePositiveInt(process.env.SAGE_TIMEOUT_MS, 3000),
  sageMockMode: process.env.SAGE_MOCK_MODE === 'true',
};

module.exports = config;
