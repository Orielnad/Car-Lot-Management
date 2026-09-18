import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { LEAD_STATUS_LABELS_HE, LEAD_STATUS_TONE } from '../lib/labels';
import type { Customer, Lead, LeadStatus } from '../lib/types';

const ALL_LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS_HE) as LeadStatus[];
const TERMINAL_LEAD_STATUSES: LeadStatus[] = ['WON', 'LOST', 'NOT_RELEVANT'];

function CreateCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', city: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/customers', {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בשמירת הלקוח.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="הוספת לקוח" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">שם מלא</label>
          <input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="phone">טלפון</label>
          <input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="email">אימייל</label>
          <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="city">עיר</label>
          <input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </Modal>
  );
}

function CreateLeadModal({
  customers,
  onClose,
  onCreated,
}: {
  customers: Customer[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/leads', { customerId, source });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בפתיחת הפנייה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="פתיחת לקוח מתעניין (ליד)" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="customerId">לקוח</label>
          <select id="customerId" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName} — {customer.phone}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="source">מקור הפנייה</label>
          <input id="source" required placeholder="לדוגמה: פייסבוק, המלצה, וואטסאפ" value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </Modal>
  );
}

function LeadStatusControl({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [isChanging, setIsChanging] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (TERMINAL_LEAD_STATUSES.includes(lead.status)) {
    return null;
  }

  async function submit(status: LeadStatus, reason?: string) {
    setIsChanging(true);
    setError(null);
    try {
      await api.patch(`/leads/${lead.id}/status`, { status, version: lead.version, lossReason: reason });
      setPendingStatus(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בעדכון הסטטוס.');
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        defaultValue=""
        disabled={isChanging}
        onChange={(e) => {
          const status = e.target.value as LeadStatus;
          e.target.value = '';
          if (status === 'LOST') {
            setPendingStatus(status);
          } else {
            submit(status);
          }
        }}
      >
        <option value="" disabled>
          שינוי סטטוס...
        </option>
        {ALL_LEAD_STATUSES.filter((s) => s !== lead.status).map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABELS_HE[status]}
          </option>
        ))}
      </select>
      {pendingStatus === 'LOST' && (
        <div style={{ marginTop: 'var(--spacing-1)' }}>
          <input placeholder="סיבת ההפסד" value={lossReason} onChange={(e) => setLossReason(e.target.value)} />
          <button style={{ marginTop: 'var(--spacing-1)' }} onClick={() => submit('LOST', lossReason)} disabled={!lossReason || isChanging}>
            אישור
          </button>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function LeadsTab() {
  const { data: leads, error, isLoading, refetch } = useApiQuery(() => api.get<Lead[]>('/leads'));
  const { data: customers } = useApiQuery(() => api.get<Customer[]>('/customers'));
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) return <LoadingState label="טוען לקוחות מתעניינים..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.fullName]));

  const columns: DataTableColumn<Lead>[] = [
    { key: 'customer', header: 'לקוח', render: (l) => customerNameById.get(l.customerId) ?? l.customerId },
    { key: 'source', header: 'מקור', render: (l) => l.source, sortValue: (l) => l.source },
    {
      key: 'status',
      header: 'סטטוס',
      render: (l) => <StatusBadge label={LEAD_STATUS_LABELS_HE[l.status]} tone={LEAD_STATUS_TONE[l.status]} />,
      sortValue: (l) => l.status,
    },
    { key: 'nextActionDate', header: 'לחזור בתאריך', render: (l) => (l.nextActionDate ? new Date(l.nextActionDate).toLocaleDateString('he-IL') : '—') },
    { key: 'actions', header: 'פעולות', render: (l) => <LeadStatusControl lead={l} onChanged={refetch} /> },
  ];

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 'var(--spacing-3)' }}>
        <button className="primary" onClick={() => setIsCreateOpen(true)} disabled={!customers || customers.length === 0}>
          פתיחת לקוח מתעניין חדש
        </button>
        {(!customers || customers.length === 0) && (
          <span style={{ color: 'var(--color-text-muted)' }}>יש להוסיף לקוח קודם בלשונית "לקוחות"</span>
        )}
      </div>

      {!leads || leads.length === 0 ? (
        <EmptyState title="אין עדיין לקוחות מתעניינים" description="פתחו פנייה כשמתקבלת התעניינות חדשה." />
      ) : (
        <DataTable columns={columns} rows={leads} getRowKey={(l) => l.id} />
      )}

      {isCreateOpen && <CreateLeadModal customers={customers ?? []} onClose={() => setIsCreateOpen(false)} onCreated={refetch} />}
    </div>
  );
}

function CustomersTab() {
  const { data: customers, error, isLoading, refetch } = useApiQuery(() => api.get<Customer[]>('/customers'));
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) return <LoadingState label="טוען לקוחות..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const columns: DataTableColumn<Customer>[] = [
    { key: 'fullName', header: 'שם מלא', render: (c) => c.fullName, sortValue: (c) => c.fullName },
    { key: 'phone', header: 'טלפון', render: (c) => c.phone },
    { key: 'email', header: 'אימייל', render: (c) => c.email ?? '—' },
    { key: 'city', header: 'עיר', render: (c) => c.city ?? '—' },
  ];

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 'var(--spacing-3)' }}>
        <button className="primary" onClick={() => setIsCreateOpen(true)}>
          הוספת לקוח
        </button>
      </div>

      {!customers || customers.length === 0 ? (
        <EmptyState title="אין עדיין לקוחות" description="הוסיפו את הלקוח הראשון." actionLabel="הוספת לקוח" onAction={() => setIsCreateOpen(true)} />
      ) : (
        <DataTable columns={columns} rows={customers} getRowKey={(c) => c.id} />
      )}

      {isCreateOpen && <CreateCustomerModal onClose={() => setIsCreateOpen(false)} onCreated={refetch} />}
    </div>
  );
}

export function CustomersPage() {
  const [tab, setTab] = useState<'customers' | 'leads'>('leads');

  return (
    <div className="page">
      <div className="page-header">
        <h1>לקוחות</h1>
        <div className="toolbar">
          <button className={tab === 'leads' ? 'primary' : ''} onClick={() => setTab('leads')}>
            לקוחות מתעניינים
          </button>
          <button className={tab === 'customers' ? 'primary' : ''} onClick={() => setTab('customers')}>
            כל הלקוחות
          </button>
        </div>
      </div>
      {tab === 'leads' ? <LeadsTab /> : <CustomersTab />}
    </div>
  );
}
