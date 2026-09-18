import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { useAuth } from '../lib/auth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  DEAL_STATUS_LABELS_HE,
  DEAL_STATUS_TONE,
  formatCurrency,
  PAYMENT_METHOD_LABELS_HE,
} from '../lib/labels';
import { ALLOWED_DEAL_TRANSITIONS } from '../lib/dealTransitions';
import type { Deal, DealStatus, Lead, PaymentMethod, Payment, Quote, Vehicle } from '../lib/types';

const CAN_RECORD_PAYMENTS = ['OWNER', 'SALES_MANAGER', 'FINANCE'] as const;
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS_HE) as PaymentMethod[];

function CreateQuoteForm({ leads, vehicles, onCreated }: { leads: Lead[]; vehicles: Vehicle[]; onCreated: () => void }) {
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [validUntil, setValidUntil] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/leads/${leadId}/quotes`, {
        vehicleId,
        price: Number(price),
        discount: Number(discount || 0),
        validUntil: new Date(validUntil).toISOString(),
      });
      onCreated();
      setPrice('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה ביצירת ההצעה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 style={{ marginTop: 0 }}>הצעת מחיר חדשה</h3>
      <div className="field">
        <label htmlFor="leadId">לקוח מתעניין</label>
        <select id="leadId" required value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.source} — {lead.status}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="vehicleId">רכב</label>
        <select id="vehicleId" required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.manufacturer} {vehicle.model} ({vehicle.licensePlate ?? 'ללא רישוי'})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="price">מחיר</label>
        <input id="price" type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="discount">הנחה</label>
        <input id="discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="validUntil">בתוקף עד</label>
        <input id="validUntil" type="date" required value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="primary" disabled={isSubmitting || !leadId || !vehicleId}>
        {isSubmitting ? 'שומר...' : 'יצירת הצעה'}
      </button>
    </form>
  );
}

function LeadQuotesList({
  lead,
  refreshToken,
  onDealCreated,
}: {
  lead: Lead;
  refreshToken: number;
  onDealCreated: () => void;
}) {
  const { data: quotes, error, isLoading, refetch } = useApiQuery(
    () => api.get<Quote[]>(`/leads/${lead.id}/quotes`),
    [lead.id, refreshToken],
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="טוען הצעות..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!quotes || quotes.length === 0) return <p style={{ color: 'var(--color-text-muted)' }}>אין עדיין הצעות עבור הליד הזה.</p>;

  async function updateStatus(quote: Quote, status: Quote['status']) {
    setBusyId(quote.id);
    setActionError(null);
    try {
      await api.patch(`/quotes/${quote.id}/status`, { status, version: quote.version });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'שגיאה בעדכון ההצעה.');
    } finally {
      setBusyId(null);
    }
  }

  async function createDeal(quote: Quote) {
    setBusyId(quote.id);
    setActionError(null);
    try {
      await api.post('/deals', { quoteId: quote.id });
      onDealCreated();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'שגיאה בפתיחת העסקה.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {actionError && <p className="field-error">{actionError}</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {quotes.map((quote) => (
          <li key={quote.id} className="card" style={{ marginBottom: 'var(--spacing-2)' }}>
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <span>
                {formatCurrency(quote.price)} (הנחה {formatCurrency(quote.discount)}) — סטטוס: {quote.status}
              </span>
              <div className="toolbar">
                {quote.status === 'DRAFT' && (
                  <button disabled={busyId === quote.id} onClick={() => updateStatus(quote, 'SENT')}>
                    סימון כנשלחה
                  </button>
                )}
                {quote.status === 'SENT' && (
                  <>
                    <button disabled={busyId === quote.id} onClick={() => updateStatus(quote, 'VIEWED')}>
                      סימון כנצפתה
                    </button>
                    <button disabled={busyId === quote.id} onClick={() => updateStatus(quote, 'REJECTED')}>
                      דחייה
                    </button>
                  </>
                )}
                {quote.status === 'VIEWED' && (
                  <>
                    <button disabled={busyId === quote.id} onClick={() => updateStatus(quote, 'APPROVED')}>
                      אישור
                    </button>
                    <button disabled={busyId === quote.id} onClick={() => updateStatus(quote, 'REJECTED')}>
                      דחייה
                    </button>
                  </>
                )}
                {quote.status === 'APPROVED' && (
                  <button className="primary" disabled={busyId === quote.id} onClick={() => createDeal(quote)}>
                    פתיחת עסקה מההצעה
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuotesTab({ onDealCreated }: { onDealCreated: () => void }) {
  const { data: leads } = useApiQuery(() => api.get<Lead[]>('/leads'));
  const { data: vehicles } = useApiQuery(() => api.get<Vehicle[]>('/vehicles'));
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [quotesRefreshToken, setQuotesRefreshToken] = useState(0);

  const openLeads = (leads ?? []).filter((l) => !['WON', 'LOST', 'NOT_RELEVANT'].includes(l.status));
  const availableVehicles = (vehicles ?? []).filter((v) => v.status === 'AVAILABLE' || v.status === 'RESERVED');
  const selectedLead = openLeads.find((l) => l.id === selectedLeadId);

  if (openLeads.length === 0) {
    return <EmptyState title="אין לקוחות מתעניינים פתוחים" description="פתחו קודם ליד פעיל בלשונית לקוחות." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
      <div className="field" style={{ maxWidth: 400 }}>
        <label htmlFor="lead-select">בחירת לקוח מתעניין</label>
        <select id="lead-select" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}>
          <option value="">בחרו...</option>
          {openLeads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.source} — {lead.status}
            </option>
          ))}
        </select>
      </div>

      {selectedLead && (
        <>
          <CreateQuoteForm
            leads={[selectedLead]}
            vehicles={availableVehicles}
            onCreated={() => setQuotesRefreshToken((t) => t + 1)}
          />
          <LeadQuotesList lead={selectedLead} refreshToken={quotesRefreshToken} onDealCreated={onDealCreated} />
        </>
      )}
    </div>
  );
}

function PaymentsPanel({ deal, canRecordPayments }: { deal: Deal; canRecordPayments: boolean }) {
  const { data: payments, error, isLoading, refetch } = useApiQuery(() => api.get<Payment[]>(`/deals/${deal.id}/payments`), [deal.id]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddPayment(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.post(`/deals/${deal.id}/payments`, { amount: Number(amount), method });
      setAmount('');
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'שגיאה ברישום התשלום.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <LoadingState label="טוען תשלומים..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <p>
        סה"כ שולם: <strong>{formatCurrency(totalPaid)}</strong> מתוך {formatCurrency(deal.salePrice)}
      </p>
      {payments && payments.length > 0 && (
        <ul style={{ margin: 0, paddingRight: 'var(--spacing-3)' }}>
          {payments.map((p) => (
            <li key={p.id}>
              {formatCurrency(p.amount)} — {PAYMENT_METHOD_LABELS_HE[p.method]}
            </li>
          ))}
        </ul>
      )}
      {canRecordPayments && (
        <form onSubmit={handleAddPayment} className="toolbar" style={{ marginTop: 'var(--spacing-2)' }}>
          <input type="number" placeholder="סכום" required value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 120 }} />
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS_HE[m]}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isSubmitting}>
            רישום תשלום
          </button>
        </form>
      )}
      {formError && <p className="field-error">{formError}</p>}
    </div>
  );
}

function DealRowDetail({ deal, canRecordPayments, onChanged }: { deal: Deal; canRecordPayments: boolean; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextOptions = ALLOWED_DEAL_TRANSITIONS[deal.status];

  async function handleChange(status: DealStatus) {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.patch(`/deals/${deal.id}/status`, { status, version: deal.version });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בעדכון סטטוס העסקה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 'var(--spacing-2)' }}>
      {nextOptions.length > 0 && (
        <div className="toolbar" style={{ marginBottom: 'var(--spacing-2)' }}>
          {nextOptions.map((status) => (
            <button key={status} disabled={isSubmitting} onClick={() => handleChange(status)}>
              {DEAL_STATUS_LABELS_HE[status]}
            </button>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
      <PaymentsPanel deal={deal} canRecordPayments={canRecordPayments} />
    </div>
  );
}

function DealsTab() {
  const { hasRole } = useAuth();
  const { data: deals, error, isLoading, refetch } = useApiQuery(() => api.get<Deal[]>('/deals'));
  const { data: vehicles } = useApiQuery(() => api.get<Vehicle[]>('/vehicles'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canRecordPayments = hasRole(...CAN_RECORD_PAYMENTS);

  if (isLoading) return <LoadingState label="טוען עסקאות..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));

  const columns: DataTableColumn<Deal>[] = [
    {
      key: 'vehicle',
      header: 'רכב',
      render: (d) => {
        const v = vehicleById.get(d.vehicleId);
        return v ? `${v.manufacturer} ${v.model}` : d.vehicleId;
      },
    },
    { key: 'salePrice', header: 'מחיר עסקה', render: (d) => formatCurrency(d.salePrice), sortValue: (d) => Number(d.salePrice) },
    {
      key: 'status',
      header: 'סטטוס',
      render: (d) => <StatusBadge label={DEAL_STATUS_LABELS_HE[d.status]} tone={DEAL_STATUS_TONE[d.status]} />,
      sortValue: (d) => d.status,
    },
  ];

  if (!deals || deals.length === 0) {
    return <EmptyState title="אין עדיין עסקאות" description="פתחו עסקה מהצעת מחיר שאושרה בלשונית הצעות מחיר." />;
  }

  return (
    <div>
      <DataTable columns={columns} rows={deals} getRowKey={(d) => d.id} onRowClick={(d) => setExpandedId(expandedId === d.id ? null : d.id)} />
      {expandedId && (
        <DealRowDetail
          deal={deals.find((d) => d.id === expandedId)!}
          canRecordPayments={canRecordPayments}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

export function DealsPage() {
  const [tab, setTab] = useState<'deals' | 'quotes'>('deals');

  return (
    <div className="page">
      <div className="page-header">
        <h1>עסקאות</h1>
        <div className="toolbar">
          <button className={tab === 'deals' ? 'primary' : ''} onClick={() => setTab('deals')}>
            עסקאות
          </button>
          <button className={tab === 'quotes' ? 'primary' : ''} onClick={() => setTab('quotes')}>
            הצעות מחיר
          </button>
        </div>
      </div>
      {tab === 'deals' ? <DealsTab /> : <QuotesTab onDealCreated={() => setTab('deals')} />}
    </div>
  );
}
