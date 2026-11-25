const defaultConfig = require('../config/env');
const { normalizeBaseUrl, joinUrl } = require('../utils/url');

class BukiClientError extends Error {
  constructor(message, { statusCode = 502, code = 'BUKI_UPSTREAM_ERROR', details = null } = {}) {
    super(message);
    this.name = 'BukiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * HTTP client for communicating with the Buki backend using Bearer auth.
 */
class BukiClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultConfig.bukiUrl);
    this.apiToken = String(options.apiToken ?? defaultConfig.bukiApiToken ?? '').trim();
    this.timeoutMs = options.timeoutMs ?? defaultConfig.bukiTimeoutMs ?? 15000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Sends an authenticated request to the configured Buki backend.
   */
  async request(routePath, { method = 'GET', body, headers = {} } = {}) {
    if (!this.baseUrl) {
      throw new BukiClientError(
        'Buki backend URL is not configured. Set BUKI_URL (e.g. https://my-buki.onrender.com).',
        { statusCode: 500, code: 'BUKI_CONFIG_ERROR' }
      );
    }

    if (!this.apiToken) {
      throw new BukiClientError(
        'BUKI_API_TOKEN is missing. Configure BUKI_API_TOKEN to authenticate with the Buki backend.',
        { statusCode: 500, code: 'BUKI_CONFIG_ERROR' }
      );
    }

    if (typeof this.fetchImpl !== 'function') {
      throw new BukiClientError(
        'Fetch API is unavailable in this Node runtime (requires Node 18+).',
        { statusCode: 500, code: 'BUKI_RUNTIME_ERROR' }
      );
    }

    const targetUrl = joinUrl(this.baseUrl, routePath);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    const requestHeaders = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiToken}`,
      ...headers,
    };

    if (body !== undefined && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    try {
      const response = await this.fetchImpl(targetUrl, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new BukiClientError('Buki backend rejected BUKI_API_TOKEN Bearer credentials.', {
          statusCode: 502,
          code: 'BUKI_AUTH_ERROR',
          details: { upstreamStatus: response.status, url: targetUrl },
        });
      }

      if (!response.ok) {
        let errorSnippet = '';
        try {
          errorSnippet = await response.text();
        } catch {
          errorSnippet = '';
        }
        throw new BukiClientError(`Buki backend returned HTTP ${response.status}.`, {
          statusCode: response.status >= 500 ? 502 : response.status,
          code: 'BUKI_UPSTREAM_ERROR',
          details: errorSnippet ? errorSnippet.slice(0, 300) : null,
        });
      }

      try {
        return await response.json();
      } catch {
        throw new BukiClientError('Buki backend returned malformed or non-JSON response.', {
          statusCode: 502,
          code: 'BUKI_INVALID_RESPONSE',
        });
      }
    } catch (err) {
      if (err instanceof BukiClientError) {
        throw err;
      }
      if (err?.name === 'AbortError') {
        throw new BukiClientError(
          `Buki backend request timed out after ${this.timeoutMs}ms.`,
          { statusCode: 504, code: 'BUKI_TIMEOUT' }
        );
      }
      throw new BukiClientError(
        `Failed to reach Buki backend at ${this.baseUrl}: ${err?.message || 'Unknown network error'}`,
        { statusCode: 502, code: 'BUKI_NETWORK_ERROR' }
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  checkHealth() {
    return this.request('/health', { method: 'GET' });
  }

  async query({ query }) {
    const encodedQuery = encodeURIComponent(String(query || '').trim());
    const payload = await this.request(`/brief?q=${encodedQuery}`, {
      method: 'GET',
    });

    if (typeof payload?.answer !== 'string' || !payload.answer.trim()) {
      throw new BukiClientError('Buki backend response did not include an answer payload.', {
        statusCode: 502,
        code: 'BUKI_INVALID_RESPONSE',
      });
    }

    const figuresText = Array.isArray(payload?.figures) && payload.figures.length > 0
      ? '\n\n' + payload.figures.map((f) => `- **${f.label}:** ${f.value}`).join('\n')
      : '';

    const citations = payload?.cited
      ? [
          {
            title: `Buki ${payload.cited.source || 'Connector'} (${payload.cited.records ?? 0} records)`,
            source: payload.cited.syncedAt ? `Synced ${payload.cited.syncedAt}` : this.baseUrl,
          },
        ]
      : [];

    return {
      requestId: `buki_${Date.now()}`,
      answer: `${payload.answer.trim()}${figuresText}`.trim(),
      citations,
      provider: 'buki',
    };
  }
}

module.exports = {
  BukiClient,
  BukiClientError,
  defaultBukiClient: new BukiClient(),
};
