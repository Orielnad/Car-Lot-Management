import { useMemo, useState, type ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

/**
 * Excel-like table per docs/design-system.md: sort by clicking a header,
 * frozen header row (sticky), no pagination surprises for small MVP datasets.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRows = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => toggleSort(column)}
                style={{
                  position: 'sticky',
                  top: 0,
                  background: 'var(--color-neutral-bg)',
                  textAlign: 'right',
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: column.sortValue ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {column.header}
                {sortKey === column.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={(e) => {
                if (onRowClick) e.currentTarget.style.background = 'var(--color-neutral-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
