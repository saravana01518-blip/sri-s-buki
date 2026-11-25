const path = require('path');
const dotenv = require('dotenv');
const { normalizeBaseUrl } = require('../utils/url');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_BUKI_URL = 'https://my-buki.onrender.com';
const DEV_FALLBACK_TOKEN = 'buki-dev-internal-token-change-me';

/**
 * Parses a positive integer environment variable with a safe fallback.
 */
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Parses CORS_ORIGIN supporting comma-separated origins while stripping trailing slashes.
 */
function parseCorsOrigin(rawOrigin, fallback) {
  const source = rawOrigin || fallback;
  if (!source) return 'http://localhost:5173';
  const list = source
    .split(',')
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean);
  return list.length <= 1 ? list[0] || 'http://localhost:5173' : list;
}

/**
 * Resolves BUKI_API_TOKEN without ever falling back to dev defaults in production.
 */
function resolveBukiApiToken(env = process.env) {
  const explicit = (env.BUKI_API_TOKEN || '').trim();
  if (explicit) return explicit;
  if (env.NODE_ENV !== 'production' && env.ALLOW_DEV_DEFAULT_TOKEN === 'true') {
    return DEV_FALLBACK_TOKEN;
  }
  return '';
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

const resolvedToken = resolveBukiApiToken(process.env);

const config = {
  port: parsePositiveInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: parseCorsOrigin(
    process.env.CORS_ORIGIN,
    process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'
  ),
  mongoUri: process.env.MONGODB_URI || '',
  bukiUrl: resolveBukiUrl(process.env),
  bukiApiToken: resolvedToken,
  bukiTimeoutMs: parsePositiveInt(process.env.BUKI_TIMEOUT_MS, 15000),
  skipTokenPrompt:
    process.env.SKIP_TOKEN_PROMPT === 'true' || process.env.AUTO_AUTH === 'true',
  sageApiUrl: normalizeBaseUrl(process.env.SAGE_API_URL || ''),
  sageApiKey: (process.env.SAGE_API_KEY || resolvedToken || '').trim(),
  sageTimeoutMs: parsePositiveInt(process.env.SAGE_TIMEOUT_MS, 3000),
  sageMockMode: process.env.SAGE_MOCK_MODE === 'true',
};

/**
 * Validates critical startup configuration and logs actionable warnings/errors.
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
    const tokenMsg =
      'BUKI_API_TOKEN is not set. Protected endpoints and outbound Buki requests will fail until configured.';
    if (cfg.nodeEnv === 'production') {
      console.error(`[config] ERROR: ${tokenMsg}`);
    } else {
      warnings.push(tokenMsg);
    }
  }

  warnings.forEach((msg) => console.warn(`[config] WARNING: ${msg}`));
  return warnings;
}

module.exports = {
  ...config,
  DEFAULT_BUKI_URL,
  resolveBukiUrl,
  resolveBukiApiToken,
  parseCorsOrigin,
  validateConfig,
};
