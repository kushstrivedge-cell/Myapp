import { FormEvent, useState } from 'react';
import { post, setTokens } from '../api';
import Button from '../components/Button';
export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [caps, setCaps] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await post<{
        accessToken: string;
        refreshToken: string;
        user: { role: string };
      }>('/auth/login', { email, password });
      if (result.user.role !== 'ADMIN')
        throw new Error('This account is not an administrator.');
      setTokens(result.accessToken, result.refreshToken);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <form onSubmit={submit} aria-busy={busy}>
        <span className="brand">CARTLY</span>
        <h1>Admin control centre</h1>
        <p>Sign in with your administrator account.</p>
        {error && (
          <div className="error" role="alert" aria-live="assertive">
            ⚠ {error}
          </div>
        )}
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          maxLength={254}
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />
        <label htmlFor="admin-password">Password</label>
        <div className="password-field">
          <input
            id="admin-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onKeyUp={event => setCaps(event.getModifierState('CapsLock'))}
            onChange={event => setPassword(event.target.value)}
            required
          />
          <button type="button" onClick={() => setShow(value => !value)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {caps && (
          <small className="caps-warning" role="status">
            Caps Lock is on
          </small>
        )}
        <Button busy={busy} type="submit">
          Sign in securely
        </Button>
      </form>
    </main>
  );
}
