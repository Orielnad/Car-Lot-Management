import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { useAuth } from '../lib/auth';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { formatCurrency, VEHICLE_STATUS_LABELS_HE, VEHICLE_STATUS_TONE } from '../lib/labels';
import { ALLOWED_VEHICLE_TRANSITIONS } from '../lib/vehicleTransitions';
import type { Branch, Vehicle, VehicleStatus } from '../lib/types';

const CAN_MANAGE_INVENTORY = ['OWNER', 'INVENTORY_MANAGER'] as const;

function CreateVehicleModal({ branches, onClose, onCreated }: { branches: Branch[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    branchId: branches[0]?.id ?? '',
    manufacturer: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    vin: '',
    mileageKm: '',
    color: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/vehicles', {
        branchId: form.branchId,
        manufacturer: form.manufacturer,
        model: form.model,
        year: Number(form.year),
        licensePlate: form.licensePlate || undefined,
        vin: form.vin || undefined,
        mileageKm: form.mileageKm ? Number(form.mileageKm) : undefined,
        color: form.color || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בשמירת הרכב.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="הוספת רכב חדש" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="branchId">סניף</label>
          <select id="branchId" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="manufacturer">יצרן</label>
          <input id="manufacturer" required value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="model">דגם</label>
          <input id="model" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="year">שנת ייצור</label>
          <input id="year" type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="licensePlate">מספר רישוי</label>
          <input id="licensePlate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="vin">מספר שלדה (VIN)</label>
          <input id="vin" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="mileageKm">קילומטראז׳</label>
          <input id="mileageKm" type="number" value={form.mileageKm} onChange={(e) => setForm({ ...form, mileageKm: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="color">צבע</label>
          <input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </Modal>
  );
}

function ChangeStatusControl({ vehicle, onChanged }: { vehicle: Vehicle; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextOptions = ALLOWED_VEHICLE_TRANSITIONS[vehicle.status];

  if (nextOptions.length === 0) {
    return null;
  }

  async function handleChange(nextStatus: VehicleStatus) {
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/vehicles/${vehicle.id}/status`, { status: nextStatus, version: vehicle.version });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בעדכון הסטטוס.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        defaultValue=""
        disabled={isSubmitting}
        onChange={(e) => {
          if (e.target.value) handleChange(e.target.value as VehicleStatus);
          e.target.value = '';
        }}
      >
        <option value="" disabled>
          שינוי סטטוס...
        </option>
        {nextOptions.map((status) => (
          <option key={status} value={status}>
            {VEHICLE_STATUS_LABELS_HE[status]}
          </option>
        ))}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function VehiclesPage() {
  const { hasRole } = useAuth();
  const { data: vehicles, error, isLoading, refetch } = useApiQuery(() => api.get<Vehicle[]>('/vehicles'));
  const { data: branches } = useApiQuery(() => api.get<Branch[]>('/branches'));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canManage = hasRole(...CAN_MANAGE_INVENTORY);

  if (isLoading) return <div className="page"><LoadingState label="טוען רכבים..." /></div>;
  if (error) return <div className="page"><ErrorState message={error} onRetry={refetch} /></div>;

  const columns: DataTableColumn<Vehicle>[] = [
    { key: 'manufacturer', header: 'יצרן ודגם', render: (v) => `${v.manufacturer} ${v.model} (${v.year})`, sortValue: (v) => v.manufacturer },
    { key: 'licensePlate', header: 'מספר רישוי', render: (v) => v.licensePlate ?? '—', sortValue: (v) => v.licensePlate ?? '' },
    { key: 'mileageKm', header: 'ק"מ', render: (v) => v.mileageKm ?? '—', sortValue: (v) => v.mileageKm ?? 0 },
    {
      key: 'status',
      header: 'סטטוס',
      render: (v) => <StatusBadge label={VEHICLE_STATUS_LABELS_HE[v.status]} tone={VEHICLE_STATUS_TONE[v.status]} />,
      sortValue: (v) => v.status,
    },
    { key: 'listPrice', header: 'מחיר פרסום', render: (v) => formatCurrency(v.listPrice), sortValue: (v) => Number(v.listPrice ?? 0) },
    ...(canManage
      ? [{ key: 'actions', header: 'פעולות', render: (v: Vehicle) => <ChangeStatusControl vehicle={v} onChanged={refetch} /> } as DataTableColumn<Vehicle>]
      : []),
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>רכבים</h1>
        {canManage && (
          <button className="primary" onClick={() => setIsCreateOpen(true)}>
            הוספת רכב
          </button>
        )}
      </div>

      {!vehicles || vehicles.length === 0 ? (
        <EmptyState
          title="אין עדיין רכבים במלאי"
          description="הוסיפו את הרכב הראשון כדי להתחיל."
          actionLabel={canManage ? 'הוספת רכב' : undefined}
          onAction={canManage ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <DataTable columns={columns} rows={vehicles} getRowKey={(v) => v.id} />
      )}

      {isCreateOpen && (
        <CreateVehicleModal branches={branches ?? []} onClose={() => setIsCreateOpen(false)} onCreated={refetch} />
      )}
    </div>
  );
}
