export function LoadingState({ label = 'טוען...' }: { label?: string }) {
  return <p style={{ color: 'var(--color-text-muted)' }}>{label}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
      <p style={{ margin: 0, marginBottom: onRetry ? 'var(--spacing-2)' : 0 }}>{message}</p>
      {onRetry && <button onClick={onRetry}>לנסות שוב</button>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>{title}</p>
      {description && <p style={{ marginTop: 'var(--spacing-1)' }}>{description}</p>}
      {actionLabel && onAction && (
        <button className="primary" style={{ marginTop: 'var(--spacing-2)' }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function NoPermissionState() {
  return (
    <div className="card">
      <p style={{ margin: 0 }}>אין לך הרשאה לצפות במסך הזה. פנו למנהל המערכת אם זה נראה לא נכון.</p>
    </div>
  );
}
