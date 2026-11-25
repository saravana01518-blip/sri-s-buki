import { useEffect, useState } from 'react';
import AuthGate from './components/AuthGate';
import IntegrationDashboard from './components/IntegrationDashboard';
import { fetchHealth } from './services/api';

const TOKEN_STORAGE_KEY = 'buki_internal_token';
const ENV_SKIP_PROMPT = import.meta.env.VITE_SKIP_TOKEN_PROMPT === 'true';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveStoredToken(value) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, value);
  } catch {
    // Ignore storage quota / privacy mode errors.
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export default function App() {
  const [token, setToken] = useState(() => readStoredToken());
  const [autoAuth, setAutoAuth] = useState(ENV_SKIP_PROMPT);
  const [signedOut, setSignedOut] = useState(false);
  const [serverHealth, setServerHealth] = useState(null);
  const [checkingSession, setCheckingSession] = useState(() => !readStoredToken() && !ENV_SKIP_PROMPT);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (token || ENV_SKIP_PROMPT || signedOut || authError) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (cancelled) return;
        setServerHealth(health || null);
        if (health?.skipTokenPrompt && health?.bukiTokenConfigured !== false) {
          setAutoAuth(true);
        }
      })
      .catch(() => {
        // Fall back to AuthGate if health probe fails.
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, signedOut, authError]);

  function handleAuthenticated(validToken) {
    saveStoredToken(validToken);
    setSignedOut(false);
    setAuthError('');
    setToken(validToken);
  }

  function handleUnauthorized(message) {
    clearStoredToken();
    setAutoAuth(false);
    setSignedOut(false);
    setToken('');
    setAuthError(message);
  }

  function handleSignOut() {
    clearStoredToken();
    setAutoAuth(false);
    setSignedOut(true);
    setToken('');
    setAuthError('');
  }

  function handleAutoConnect() {
    setSignedOut(false);
    setAuthError('');
    setAutoAuth(true);
  }

  if (checkingSession) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p>Connecting to Buki workspace...</p>
        </div>
      </div>
    );
  }

  if (!token && !autoAuth) {
    return (
      <AuthGate
        onAuthenticated={handleAuthenticated}
        onAutoConnect={
          serverHealth?.skipTokenPrompt && serverHealth?.bukiTokenConfigured !== false
            ? handleAutoConnect
            : null
        }
        serverHealth={serverHealth}
        initialError={authError}
      />
    );
  }

  return (
    <IntegrationDashboard
      token={token}
      onUnauthorized={handleUnauthorized}
      onSignOut={handleSignOut}
    />
  );
}
