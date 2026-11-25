const path = require('path');
const dotenv = require('dotenv');
const { normalizeBaseUrl } = require('../utils/url');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_BUKI_URL = 'https://my-buki.onrender.com';

/**
 * Parses a positive integer environment variable with a safe fallback.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Resolves the target Buki backend URL with clear precedence:
 * BUKI_URL > BUKI_API_URL > BUKI_BASE_URL > DEFAULT_BUKI_URL.
 */
function resolveBukiUrl(env = process.env) {
  const raw =
    env.BUKI_URL ||
    env.BUKI_API_URL ||
    env.BUKI_BASE_URL ||
    DEFAULT_BUKI_URL;
  return normalizeBaseUrl(raw);
}

const config = {
  port: parsePositiveInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin:
    process.env.CORS_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  bukiUrl: resolveBukiUrl(process.env),
  bukiApiToken: (process.env.BUKI_API_TOKEN || '').trim(),
  sageApiUrl: normalizeBaseUrl(process.env.SAGE_API_URL || ''),
  sageApiKey: (process.env.SAGE_API_KEY || '').trim(),
  sageTimeoutMs: parsePositiveInt(process.env.SAGE_TIMEOUT_MS, 3000),
  sageMockMode: process.env.SAGE_MOCK_MODE === 'true',
};

/**
 * Validates critical startup configuration and logs actionable warnings.
 */
function validateConfig(cfg = config) {
  const warnings = [];

  if (!cfg.bukiUrl) {
    warnings.push('BUKI_URL is empty. Set BUKI_URL (e.g. https://my-buki.onrender.com).');
  } else {
    try {
      const parsed = new URL(cfg.bukiUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        warnings.push(`BUKI_URL must use http:// or https:// (got "${cfg.bukiUrl}").`);
      }
    } catch {
      warnings.push(`BUKI_URL is not a valid URL: "${cfg.bukiUrl}".`);
    }
  }

  if (!cfg.bukiApiToken) {
    warnings.push(
      'BUKI_API_TOKEN is not set. Protected endpoints and outbound Buki requests will fail until configured.'
    );
  }

  warnings.forEach((msg) => console.warn(`[config] WARNING: ${msg}`));
  return warnings;
}

module.exports = {
  ...config,
  DEFAULT_BUKI_URL,
  resolveBukiUrl,
  validateConfig,
};
