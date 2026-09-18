import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'אירעה שגיאה. נסו שוב.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-4)',
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ marginTop: 0, fontSize: '1.3rem', textAlign: 'center' }}>כניסה למערכת ניהול מגרש הרכבים</h1>
        <div className="field">
          <label htmlFor="email">אימייל</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
