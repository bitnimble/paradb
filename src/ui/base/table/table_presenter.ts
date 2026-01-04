import { IComputedValue, IObservableValue, makeAutoObservable, makeObservable } from 'mobx';
import { Columns } from './table';

export type SortDirection = 'asc' | 'desc';

export class TableSortStore<T, N extends number> {
  sortColumn: number | undefined = undefined;
  sortDirection: SortDirection | undefined = undefined;

  constructor(
    readonly columns: Columns<T, N>,
    sortColumn: number = 0,
    sortDirection: SortDirection = 'asc'
  ) {
    makeObservable(this, {
      sortColumn: true,
      sortDirection: true,
    });
    this.sortColumn = sortColumn;
    this.sortDirection = sortDirection;
  }
}

export class TableStore<T> {
  constructor(readonly data: IObservableValue<T[] | undefined> | IComputedValue<T[] | undefined>) {
    makeAutoObservable(this);
  }
}

export class TablePresenter<T, N extends number> {
  constructor(
    private readonly sortStore: TableSortStore<T, N>,
    private readonly onSortChange?: () => void
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  private setSortColumn(column: number) {
    if (column < 0 || column >= this.sortStore.columns.length) {
      return;
    }
    this.sortStore.sortColumn = column;
  }

  private setSortDirection(direction: 'asc' | 'desc') {
    this.sortStore.sortDirection = direction;
    if (this.onSortChange) {
      this.onSortChange();
    }
  }

  onColumnClick(columnIndex: number) {
    if (columnIndex !== this.sortStore.sortColumn) {
      this.setSortColumn(columnIndex);
      this.setSortDirection('desc');
    } else {
      this.setSortDirection(this.sortStore.sortDirection === 'asc' ? 'desc' : 'asc');
    }
  }
}
