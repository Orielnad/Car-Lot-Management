import type { ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--spacing-5) var(--spacing-3)',
        overflowY: 'auto',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
          <button onClick={onClose} aria-label="סגירה">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
