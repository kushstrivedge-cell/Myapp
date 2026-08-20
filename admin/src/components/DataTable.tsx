import { ReactNode, useMemo, useState } from 'react';
import EmptyState from './EmptyState';
export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  numeric?: boolean;
};
export default function DataTable<T extends object>({
  rows,
  columns,
  caption = 'Records',
}: {
  rows: T[];
  columns: Column<T>[];
  caption?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 } | null>(
    null,
  );
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find(item => item.key === sort.key);
    if (!column?.sortValue) return rows;
    return [...rows].sort(
      (a, b) =>
        String(column.sortValue!(a)).localeCompare(
          String(column.sortValue!(b)),
          undefined,
          { numeric: true },
        ) * sort.direction,
    );
  }, [rows, columns, sort]);
  if (!rows.length) return <EmptyState title="No records found" />;
  return (
    <>
      <div className="table">
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={column.numeric ? 'numeric' : undefined}
                >
                  {column.sortValue ? (
                    <button
                      className="sort-button"
                      onClick={() =>
                        setSort(value =>
                          value?.key === column.key
                            ? {
                                key: column.key,
                                direction: value.direction === 1 ? -1 : 1,
                              }
                            : { key: column.key, direction: 1 },
                        )
                      }
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {sort?.key === column.key
                          ? sort.direction === 1
                            ? ' ↑'
                            : ' ↓'
                          : ' ↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr
                tabIndex={0}
                key={String(('id' in row ? row.id : undefined) ?? index)}
              >
                {columns.map(column => (
                  <td
                    className={column.numeric ? 'numeric' : undefined}
                    key={column.key}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="row-count">
        {rows.length.toLocaleString('en-IN')} record
        {rows.length === 1 ? '' : 's'}
      </p>
    </>
  );
}
