import { useState } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { verifySessionToken } from '../services/api';

export default function AuthGate({
  onAuthenticated,
  onAutoConnect = null,
  serverHealth = null,
  initialError = '',
}) {
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  const missingServerToken = serverHealth && serverHealth.bukiTokenConfigured === false;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Enter your Buki internal Bearer token to continue.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await verifySessionToken(trimmed);
      onAuthenticated(trimmed);
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-badge">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1>Buki × Sage</h1>
            <p>Internal Team Assistant — Session Required</p>
          </div>
        </div>

        {missingServerToken && (
          <div className="error-banner" role="alert">
            <AlertCircle size={16} />
            <span>
              Server <code>BUKI_API_TOKEN</code> is not configured. Set <code>BUKI_API_TOKEN</code>{' '}
              (and optionally <code>SKIP_TOKEN_PROMPT=true</code>) in Render → Environment or{' '}
              <code>backend/.env</code>.
            </span>
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="buki-token-input">Buki Internal Bearer Token</label>
          <div className="token-input-wrap">
            <KeyRound size={16} className="input-icon" />
            <input
              id="buki-token-input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your BUKI_API_TOKEN..."
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <p className="auth-hint">
            Local dev default in <code>backend/.env.example</code>:{' '}
            <code>buki-dev-internal-token-change-me</code>
          </p>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" />
                Verifying session...
              </>
            ) : (
              'Connect to Sage'
            )}
          </button>

          {onAutoConnect && (
            <button
              type="button"
              onClick={onAutoConnect}
              className="btn-primary"
              style={{ marginTop: '8px', opacity: 0.9 }}
            >
              Continue with Server Session
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
