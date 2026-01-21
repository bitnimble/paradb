import { action, IComputedValue, IObservableValue, observable } from 'mobx';
import { Columns } from './table';

export type SortDirection = 'asc' | 'desc';

export class TableSortStore<T, N extends number> {
  @observable accessor sortColumn: number;
  @observable accessor sortDirection: SortDirection;

  constructor(
    readonly columns: Columns<T, N>,
    readonly defaultSortColumn: number,
    readonly defaultSortDirection: SortDirection
  ) {
    this.sortColumn = defaultSortColumn;
    this.sortDirection = defaultSortDirection;
  }

  @action.bound resetSort() {
    this.sortColumn = this.defaultSortColumn;
    this.sortDirection = this.defaultSortDirection;
  }
}

export class TableStore<T> {
  constructor(readonly data: IObservableValue<T[] | undefined> | IComputedValue<T[] | undefined>) {}
}

export class TablePresenter<T, N extends number> {
  constructor(
    private readonly sortStore: TableSortStore<T, N>,
    private readonly onSortChange?: () => void
  ) {}

  @action private setSortColumn(column: number) {
    if (column < 0 || column >= this.sortStore.columns.length) {
      return;
    }
    this.sortStore.sortColumn = column;
  }

  @action private setSortDirection(direction: 'asc' | 'desc') {
    this.sortStore.sortDirection = direction;
    if (this.onSortChange) {
      this.onSortChange();
    }
  }

  @action.bound onColumnClick(columnIndex: number) {
    if (columnIndex !== this.sortStore.sortColumn) {
      this.setSortColumn(columnIndex);
      this.setSortDirection('desc');
    } else {
      this.setSortDirection(this.sortStore.sortDirection === 'asc' ? 'desc' : 'asc');
    }
  }
}
