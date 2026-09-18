import type { StatusTone } from '../lib/labels';

const TONE_STYLES: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--color-neutral-bg)', fg: 'var(--color-text)' },
  success: { bg: 'var(--color-success-bg)', fg: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' },
  danger: { bg: 'var(--color-danger-bg)', fg: 'var(--color-danger)' },
  primary: { bg: '#e3edf9', fg: 'var(--color-primary)' },
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const style = TONE_STYLES[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: '0.85rem',
        fontWeight: 600,
        background: style.bg,
        color: style.fg,
      }}
    >
      {label}
    </span>
  );
}
