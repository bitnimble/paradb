import classNames from 'classnames';
import { toJS } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import styles from './table.module.css';
import { TablePresenter, TableSortStore, TableStore } from './table_presenter';

type Tuple<T, N extends number> = [T, ...T[]] & { length: N };

export type Row<N extends number> = {
  className?: string;
  Cells: Tuple<React.ComponentType, N>;
};

export type Column<T> = {
  content: React.ReactNode;
  sortLabel?: keyof T;
  style?: React.CSSProperties;
};

export type Columns<T, N extends number> = Tuple<Column<T>, N>;

type TableProps<T, N extends number> = {
  store: TableStore<T>;
  sortStore: TableSortStore<T, N>;
  tableClassname?: string;
  rowClassname?: string;
  cellClassname?: string;
  rowMapper: (t: T) => Row<N>;
  onSortChange?: () => void;
};

type RowMemoProps<T, N extends number> = {
  value: T;
  rowMapper: (t: T) => Row<N>;
  cellClassname?: string;
  rowClassname?: string;
};

const RowMemo = observer(<T, N extends number>(props: RowMemoProps<T, N>) => {
  const { value, rowClassname, rowMapper } = props;
  const cellClass = classNames(styles.cell, props.cellClassname);
  const row = rowMapper(value);
  const rowClass = classNames(styles.row, rowClassname, row.className);
  return (
    <tr className={rowClass}>
      {row.Cells.map((Cell, x) => (
        <td className={cellClass} key={x}>
          <Cell />
        </td>
      ))}
    </tr>
  );
});

export const Table = observer(
  <T extends { id: string }, N extends number>(props: TableProps<T, N>) => {
    const { store, tableClassname, cellClassname, rowClassname, rowMapper, onSortChange } = props;
    const { data: _data } = store;
    const { columns, sortColumn, sortDirection } = props.sortStore;
    const data = _data.get();
    const [presenter] = React.useState(() => new TablePresenter(props.sortStore, onSortChange));

    const Rows = observer(() => {
      if (!data) {
        return <LoadingRow cellClassname={cellClassname} />;
      }
      if (data.length === 0) {
        return <NoResultsRow cellClassname={cellClassname} />;
      }
      return (
        <>
          {data.map((row) => (
            <RowMemo
              value={row}
              rowMapper={rowMapper}
              cellClassname={cellClassname}
              rowClassname={rowClassname}
              key={row.id}
            />
          ))}
        </>
      );
    });

    const tableClass = classNames(styles.table, tableClassname);
    const cellClass = classNames(styles.cell, props.cellClassname);

    return (
      <table className={tableClass}>
        <thead className={styles.header}>
          <tr>
            {columns.map((c, x) => (
              <th
                className={classNames(cellClass, !!c.sortLabel && styles.sortable)}
                key={x}
                onMouseDown={preventDoubleClickSelection}
                onClick={c.sortLabel ? () => presenter.onColumnClick(x) : undefined}
                style={toJS(c.style)}
              >
                {c.content} {sortColumn === x && (sortDirection === 'asc' ? '🠕' : '🠗')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Rows />
        </tbody>
      </table>
    );
  }
);

const LoadingRow = (props: { cellClassname: string | undefined }) => {
  const cellClass = classNames(styles.cell, props.cellClassname);
  return (
    <tr className={cellClass} style={{ gridColumn: '1 / -1' }}>
      <td>Loading...</td>
    </tr>
  );
};

const NoResultsRow = (props: { cellClassname: string | undefined }) => {
  const cellClass = classNames(styles.cell, props.cellClassname);
  return (
    <tr className={cellClass} style={{ gridColumn: '1 / -1' }}>
      <td>No results found.</td>
    </tr>
  );
};

const preventDoubleClickSelection = (e: React.MouseEvent) => {
  if (e.detail > 1) {
    e.preventDefault();
  }
};
