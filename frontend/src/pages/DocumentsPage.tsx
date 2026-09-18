import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../lib/useApiQuery';
import { DataTable, type DataTableColumn } from '../components/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { DOCUMENT_TYPE_LABELS_HE, formatDate, TASK_ENTITY_TYPE_LABELS_HE } from '../lib/labels';
import type { Customer, DocumentRecord, DocumentType, Lead, TaskEntityType, Vehicle } from '../lib/types';
import { TASK_ENTITY_TYPES } from '../lib/types';

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS_HE) as DocumentType[];

function useEntityOptions(entityType: TaskEntityType) {
  const leads = useApiQuery(() => api.get<Lead[]>('/leads'));
  const customers = useApiQuery(() => api.get<Customer[]>('/customers'));
  const vehicles = useApiQuery(() => api.get<Vehicle[]>('/vehicles'));

  switch (entityType) {
    case 'Lead':
      return (leads.data ?? []).map((l) => ({ id: l.id, label: `${l.source} — ${l.status}` }));
    case 'Customer':
      return (customers.data ?? []).map((c) => ({ id: c.id, label: `${c.fullName} — ${c.phone}` }));
    case 'Vehicle':
      return (vehicles.data ?? []).map((v) => ({ id: v.id, label: `${v.manufacturer} ${v.model} (${v.licensePlate ?? 'ללא רישוי'})` }));
    case 'Deal':
      return [];
  }
}

function DownloadButton({ document }: { document: DocumentRecord }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const { blob, fileName } = await api.download(`/documents/${document.id}/download`);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בהורדת הקובץ.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <button disabled={isDownloading} onClick={handleDownload}>
        הורדה
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function DocumentsPage() {
  const [entityType, setEntityType] = useState<TaskEntityType>('Vehicle');
  const [entityId, setEntityId] = useState('');
  const [docType, setDocType] = useState<DocumentType>('LICENSE');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entityOptions = useEntityOptions(entityType);

  const {
    data: documents,
    error,
    isLoading,
    refetch,
  } = useApiQuery(
    () => (entityId ? api.get<DocumentRecord[]>(`/documents?entityType=${entityType}&entityId=${entityId}`) : Promise.resolve([])),
    [entityType, entityId],
  );

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!entityId) {
      setUploadError('יש לבחור ישות מקושרת.');
      return;
    }
    if (!file) {
      setUploadError('יש לבחור קובץ להעלאה.');
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('docType', docType);
      formData.append('file', file);
      await api.upload('/documents', formData);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'שגיאה בהעלאת הקובץ.');
    } finally {
      setIsUploading(false);
    }
  }

  const columns: DataTableColumn<DocumentRecord>[] = [
    { key: 'fileName', header: 'שם קובץ', render: (d) => d.fileName },
    { key: 'type', header: 'סוג מסמך', render: (d) => DOCUMENT_TYPE_LABELS_HE[d.type] },
    { key: 'createdAt', header: 'תאריך העלאה', render: (d) => formatDate(d.createdAt) },
    { key: 'download', header: '', render: (d) => <DownloadButton document={d} /> },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>מסמכים</h1>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-3)' }}>
        <div className="toolbar">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="doc-entity-type">סוג ישות</label>
            <select
              id="doc-entity-type"
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
          <div className="field" style={{ marginBottom: 0, minWidth: 240 }}>
            <label htmlFor="doc-entity-id">בחירה</label>
            <select id="doc-entity-id" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">בחרו...</option>
              {entityOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {entityId && (
        <div className="card" style={{ marginBottom: 'var(--spacing-3)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>העלאת מסמך</h2>
          <form onSubmit={handleUpload} className="toolbar">
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS_HE[t]}
                </option>
              ))}
            </select>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" />
            <button type="submit" className="primary" disabled={isUploading}>
              {isUploading ? 'מעלה...' : 'העלאה'}
            </button>
          </form>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 0 }}>
            ניתן להעלות קבצי PDF, JPG או PNG בלבד, עד 10MB.
          </p>
          {uploadError && <p className="field-error">{uploadError}</p>}
        </div>
      )}

      {!entityId ? (
        <EmptyState title="בחרו ישות כדי לראות את המסמכים שלה" description="למשל רכב מסוים או לקוח מתעניין." />
      ) : isLoading ? (
        <LoadingState label="טוען מסמכים..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !documents || documents.length === 0 ? (
        <EmptyState title="אין עדיין מסמכים" description="העלו את המסמך הראשון למעלה." />
      ) : (
        <DataTable columns={columns} rows={documents} getRowKey={(d) => d.id} />
      )}
    </div>
  );
}
