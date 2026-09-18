import { api } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { useAuth } from '../lib/auth';
import { ErrorState, LoadingState } from '../components/States';
import { formatCurrency, TASK_TYPE_LABELS_HE } from '../lib/labels';
import type { InventoryReport, LeadsReport, MyPerformanceReport, SalesReport, Task } from '../lib/types';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ minWidth: 180 }}>
      <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function MyTasksCard() {
  const { data, error, isLoading, refetch } = useApiQuery(() => api.get<Task[]>('/tasks/mine'));

  if (isLoading) return <LoadingState label="טוען משימות..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const openTasks = (data ?? []).filter((task) => task.status === 'OPEN');

  return (
    <div className="card">
      <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>המשימות שלי</h2>
      {openTasks.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>אין לך משימות פתוחות כרגע.</p>
      ) : (
        <ul style={{ margin: 0, paddingRight: 'var(--spacing-3)' }}>
          {openTasks.slice(0, 8).map((task) => (
            <li key={task.id} style={{ marginBottom: 'var(--spacing-1)' }}>
              {TASK_TYPE_LABELS_HE[task.type]}
              {task.dueAt ? ` — עד ${new Date(task.dueAt).toLocaleDateString('he-IL')}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MyPerformanceCard() {
  const { data, error, isLoading, refetch } = useApiQuery(() =>
    api.get<MyPerformanceReport>('/reports/my-performance'),
  );

  if (isLoading) return <LoadingState label="טוען ביצועים..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="toolbar">
      <StatCard label="עסקאות שנסגרו" value={data.dealsCounted} />
      <StatCard label="סך הכנסות" value={formatCurrency(data.totalRevenue)} />
    </div>
  );
}

function InventorySnapshot() {
  const { data, error, isLoading } = useApiQuery(() => api.get<InventoryReport>('/reports/inventory'));
  if (isLoading || error || !data) return null;
  return (
    <div className="toolbar">
      <StatCard label="רכבים זמינים" value={data.availableVehicleCount} />
      <StatCard label="שווי מלאי זמין" value={formatCurrency(data.availableInventoryValue)} />
      <StatCard label="ימים ממוצעים במלאי" value={data.averageAgeDaysInStock} />
    </div>
  );
}

function SalesSnapshot() {
  const { data, error, isLoading } = useApiQuery(() => api.get<SalesReport>('/reports/sales'));
  if (isLoading || error || !data) return null;
  return (
    <div className="toolbar">
      <StatCard label="עסקאות שהניבו הכנסה" value={data.countedDealsForRevenue} />
      <StatCard label="סך הכנסות" value={formatCurrency(data.totalRevenue)} />
    </div>
  );
}

function LeadsSnapshot() {
  const { data, error, isLoading } = useApiQuery(() => api.get<LeadsReport>('/reports/leads'));
  if (isLoading || error || !data) return null;
  return (
    <div className="toolbar">
      <StatCard label="אחוז המרה" value={`${data.conversionRatePercent}%`} />
    </div>
  );
}

export function HomePage() {
  const { user, hasRole } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <h1>שלום, {user?.fullName}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <MyPerformanceCard />
        <MyTasksCard />

        {hasRole('OWNER', 'SALES_MANAGER', 'INVENTORY_MANAGER', 'FINANCE', 'VIEWER') && (
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>תמונת מצב — מלאי</h2>
            <InventorySnapshot />
          </div>
        )}
        {hasRole('OWNER', 'SALES_MANAGER', 'FINANCE') && (
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>תמונת מצב — מכירות</h2>
            <SalesSnapshot />
          </div>
        )}
        {hasRole('OWNER', 'SALES_MANAGER') && (
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>תמונת מצב — לקוחות מתעניינים</h2>
            <LeadsSnapshot />
          </div>
        )}
      </div>
    </div>
  );
}
