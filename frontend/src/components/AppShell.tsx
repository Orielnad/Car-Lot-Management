import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { NAV_LABELS, ROLE_LABELS_HE } from '../lib/labels';

const NAV_ITEMS = [
  { to: '/', label: NAV_LABELS.home, end: true },
  { to: '/vehicles', label: NAV_LABELS.vehicles },
  { to: '/customers', label: NAV_LABELS.customers },
  { to: '/tasks', label: NAV_LABELS.tasks },
  { to: '/deals', label: NAV_LABELS.deals },
  { to: '/documents', label: NAV_LABELS.documents },
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-3) var(--spacing-4)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          gap: 'var(--spacing-3)',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: '1.1rem' }}>מגרש רכבים</strong>
        <nav style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: '6px 12px',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
                color: isActive ? '#fff' : 'var(--color-text)',
                background: isActive ? 'var(--color-primary)' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          {user && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              {user.fullName} · {user.roles.map((r) => ROLE_LABELS_HE[r]).join(', ')}
            </span>
          )}
          <button onClick={logout}>יציאה</button>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
