import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  TASK_ENTITY_TYPE_LABELS_HE,
  TASK_PRIORITY_LABELS_HE,
  TASK_STATUS_LABELS_HE,
  TASK_STATUS_TONE,
  TASK_TYPE_LABELS_HE,
} from '../lib/labels';
import type { Customer, Deal, Lead, Task, TaskEntityType, TaskPriority, TaskType, Vehicle } from '../lib/types';
import { TASK_ENTITY_TYPES } from '../lib/types';

const TASK_TYPES = Object.keys(TASK_TYPE_LABELS_HE) as TaskType[];
const TASK_PRIORITIES = Object.keys(TASK_PRIORITY_LABELS_HE) as TaskPriority[];

function useEntityOptions(entityType: TaskEntityType) {
  const leads = useApiQuery(() => api.get<Lead[]>('/leads'));
  const customers = useApiQuery(() => api.get<Customer[]>('/customers'));
  const vehicles = useApiQuery(() => api.get<Vehicle[]>('/vehicles'));
  const deals = useApiQuery(() => api.get<Deal[]>('/deals'));

  switch (entityType) {
    case 'Lead':
      return (leads.data ?? []).map((l) => ({ id: l.id, label: `${l.source} — ${l.status}` }));
    case 'Customer':
      return (customers.data ?? []).map((c) => ({ id: c.id, label: `${c.fullName} — ${c.phone}` }));
    case 'Vehicle':
      return (vehicles.data ?? []).map((v) => ({ id: v.id, label: `${v.manufacturer} ${v.model} (${v.licensePlate ?? 'ללא רישוי'})` }));
    case 'Deal':
      return (deals.data ?? []).map((d) => ({ id: d.id, label: `עסקה ${d.id.slice(0, 8)}` }));
  }
}

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [entityType, setEntityType] = useState<TaskEntityType>('Lead');
  const [entityId, setEntityId] = useState('');
  const [type, setType] = useState<TaskType>('CALL');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const entityOptions = useEntityOptions(entityType);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!entityId) {
      setError('יש לבחור ישות מקושרת.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/tasks', {
        entityType,
        entityId,
        type,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        notes: notes || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בשמירת המשימה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="משימה חדשה" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="entityType">קשור ל</label>
          <select
            id="entityType"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as TaskEntityType);
              setEntityId('');
            }}
          >
            {TASK_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_ENTITY_TYPE_LABELS_HE[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="entityId">בחירה</label>
          <select id="entityId" required value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="" disabled>
              בחרו...
            </option>
            {entityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="type">סוג משימה</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS_HE[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority">עדיפות</label>
          <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS_HE[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dueAt">תאריך יעד</label>
          <input id="dueAt" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="notes">הערות</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="primary" style={{ width: '100%' }} disabled={isSubmitting}>
          {isSubmitting ? 'שומר...' : 'שמירה'}
        </button>
      </form>
    </Modal>
  );
}

function TaskActions({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (task.status !== 'OPEN') {
    return null;
  }

  async function updateStatus(status: 'DONE' | 'CANCELLED') {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.patch(`/tasks/${task.id}/status`, { status, version: task.version });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בעדכון המשימה.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="toolbar" onClick={(e) => e.stopPropagation()}>
      <button disabled={isSubmitting} onClick={() => updateStatus('DONE')}>
        סימון כבוצע
      </button>
      <button disabled={isSubmitting} onClick={() => updateStatus('CANCELLED')}>
        ביטול
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TasksPage() {
  const { data: tasks, error, isLoading, refetch } = useApiQuery(() => api.get<Task[]>('/tasks/mine'));
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) return <div className="page"><LoadingState label="טוען משימות..." /></div>;
  if (error) return <div className="page"><ErrorState message={error} onRetry={refetch} /></div>;

  const columns: DataTableColumn<Task>[] = [
    { key: 'type', header: 'סוג', render: (t) => TASK_TYPE_LABELS_HE[t.type], sortValue: (t) => t.type },
    { key: 'entity', header: 'קשור ל', render: (t) => TASK_ENTITY_TYPE_LABELS_HE[t.entityType] },
    { key: 'priority', header: 'עדיפות', render: (t) => TASK_PRIORITY_LABELS_HE[t.priority] },
    { key: 'dueAt', header: 'תאריך יעד', render: (t) => (t.dueAt ? new Date(t.dueAt).toLocaleDateString('he-IL') : '—'), sortValue: (t) => t.dueAt ?? '' },
    {
      key: 'status',
      header: 'סטטוס',
      render: (t) => <StatusBadge label={TASK_STATUS_LABELS_HE[t.status]} tone={TASK_STATUS_TONE[t.status]} />,
      sortValue: (t) => t.status,
    },
    { key: 'actions', header: 'פעולות', render: (t) => <TaskActions task={t} onChanged={refetch} /> },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>משימות</h1>
        <button className="primary" onClick={() => setIsCreateOpen(true)}>
          משימה חדשה
        </button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState title="אין לך משימות" description="קבעו משימת מעקב כדי לא לפספס לחזור ללקוח." actionLabel="משימה חדשה" onAction={() => setIsCreateOpen(true)} />
      ) : (
        <DataTable columns={columns} rows={tasks} getRowKey={(t) => t.id} />
      )}

      {isCreateOpen && <CreateTaskModal onClose={() => setIsCreateOpen(false)} onCreated={refetch} />}
    </div>
  );
}
