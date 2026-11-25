import { useEffect, useState } from 'react';
import AuthGate from './components/AuthGate';
import QueryAssistant from './components/QueryAssistant';
import { fetchHealth } from './services/api';

const TOKEN_STORAGE_KEY = 'buki_internal_token';
const ENV_SKIP_PROMPT = import.meta.env.VITE_SKIP_TOKEN_PROMPT === 'true';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [autoAuth, setAutoAuth] = useState(ENV_SKIP_PROMPT);
  const [checkingSession, setCheckingSession] = useState(() => !localStorage.getItem(TOKEN_STORAGE_KEY) && !ENV_SKIP_PROMPT);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (token || ENV_SKIP_PROMPT) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (!cancelled && health?.skipTokenPrompt) {
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
  }, [token]);

  function handleAuthenticated(validToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, validToken);
    setAuthError('');
    setToken(validToken);
  }

  function handleUnauthorized(message) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAutoAuth(false);
    setToken('');
    setAuthError(message);
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAutoAuth(false);
    setToken('');
    setAuthError('');
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
    return <AuthGate onAuthenticated={handleAuthenticated} initialError={authError} />;
  }

  return (
    <QueryAssistant
      token={token}
      onUnauthorized={handleUnauthorized}
      onSignOut={handleSignOut}
    />
  );
}
