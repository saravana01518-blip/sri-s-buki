import { useState } from 'react';
import AuthGate from './components/AuthGate';
import QueryAssistant from './components/QueryAssistant';

const TOKEN_STORAGE_KEY = 'buki_internal_token';

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [authError, setAuthError] = useState('');

  function handleAuthenticated(validToken) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, validToken);
    setAuthError('');
    setToken(validToken);
  }

  function handleUnauthorized(message) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setAuthError(message);
  }

  function handleSignOut() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setAuthError('');
  }

  if (!token) {
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
