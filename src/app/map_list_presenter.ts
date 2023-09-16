import { checkExists } from 'base/preconditions';
import { TableStore } from 'ui/base/table/table_presenter';
import { makeAutoObservable, runInAction } from 'mobx';
import { computedFn } from 'mobx-utils';
import { Api } from 'api/api';
import { getMapFileLink } from 'utils/maps';
import { PDMap, MapSortableAttributes, mapSortableAttributes } from 'schema/maps';

const SEARCH_LIMIT = 20;

export class MapListStore {
  enableBulkSelect = false;
  query: string = '';
  selectedMaps = new Set<string>();
  lastSelectedMapIndex?: number = undefined;
  maps?: PDMap[] = undefined;
  hasMore = true;
  loadingMore = false;
  isFirstSearch = true;

  tableStore?: TableStore<PDMap, 7>;

  constructor() {
    makeAutoObservable(this);
  }
}

async function delay(ms: number = 5) {
  return new Promise<void>((res) => {
    setTimeout(() => res(), ms);
  });
}

export class MapListPresenter {
  constructor(
    private readonly api: Api,
    private readonly store: MapListStore
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  toggleMapSelection(id: string, shiftKeyHeld: boolean) {
    const index = checkExists(this.store.maps).findIndex((m) => m.id === id);

    if (
      shiftKeyHeld &&
      this.store.lastSelectedMapIndex != null &&
      index > this.store.lastSelectedMapIndex
    ) {
      for (let i = this.store.lastSelectedMapIndex + 1; i <= index; i++) {
        this.store.selectedMaps.add(checkExists(this.store.maps)[i].id);
      }
      this.store.lastSelectedMapIndex = index;
    } else {
      if (this.store.selectedMaps.has(id)) {
        this.store.selectedMaps.delete(id);
        this.store.lastSelectedMapIndex = undefined;
      } else {
        this.store.selectedMaps.add(id);
        this.store.lastSelectedMapIndex = index;
      }
    }
  }

  onClickBulkSelect() {
    this.store.enableBulkSelect = true;
  }

  async onClickBulkDownload() {
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);

    for (const id of this.store.selectedMaps.keys()) {
      a.setAttribute('href', getMapFileLink(id));
      a.click();
      // If there's no delay between attempts, the browser will only download a single file.
      await delay(1000);
    }

    a.remove();
  }

  onClickCancelBulkSelect() {
    this.store.enableBulkSelect = false;
    this.store.selectedMaps.clear();
  }

  readonly isSelected = computedFn((id: string) => {
    return this.store.enableBulkSelect && this.store.selectedMaps.has(id);
  });

  onChangeQuery(val: string) {
    this.store.query = val;
    this.store.lastSelectedMapIndex = undefined;
  }

  private getTableSortParams() {
    const tableStore = checkExists(this.store.tableStore);
    if (tableStore.sortColumn == null || tableStore.sortDirection == null) {
      return null;
    }
    const label = tableStore.columns[tableStore.sortColumn].sortLabel as MapSortableAttributes;
    if (label == null) {
      return null;
    }
    // Double check that it's in the sortable attribute list
    if (!mapSortableAttributes.includes(label)) {
      return null;
    }
    return { sort: label, sortDirection: tableStore.sortDirection };
  }

  async onSortChanged() {
    const sort = this.getTableSortParams();
    if (!sort) {
      return;
    }
    return this.onSearch('sort');
  }

  async onSearch(trigger: 'sort' | 'search') {
    // The default sort on first load is by "new" to surface new maps, but when the user searches
    // for something manually for the first time, we want to revert back to unsorted (i.e. sort
    // the search results by relevance instead).
    if (
      trigger === 'search' &&
      this.store.maps &&
      this.store.isFirstSearch &&
      this.store.tableStore != null
    ) {
      runInAction(() => {
        this.store.isFirstSearch = false;
        checkExists(this.store.tableStore).sortColumn = undefined;
        checkExists(this.store.tableStore).sortDirection = undefined;
      });
    }
    const sort = this.getTableSortParams();
    runInAction(() => (this.store.maps = undefined));
    const resp = await this.api.searchMaps({
      query: this.store.query,
      limit: SEARCH_LIMIT,
      offset: 0,
      ...(sort || {}),
    });
    if (resp.success) {
      runInAction(() => {
        this.store.maps = resp.maps;
        this.store.hasMore = resp.maps.length >= SEARCH_LIMIT;
      });
    }
    this.store.lastSelectedMapIndex = undefined;
  }

  async onLoadMore() {
    const sort = this.getTableSortParams();
    runInAction(() => (this.store.loadingMore = true));
    const resp = await this.api.searchMaps({
      query: this.store.query,
      limit: SEARCH_LIMIT,
      offset: this.store.maps?.length || 0,
      ...(sort || {}),
    });
    runInAction(() => (this.store.loadingMore = false));
    if (resp.success) {
      runInAction(() => {
        if (this.store.maps) {
          this.store.maps.push(...resp.maps);
        } else {
          this.store.maps = resp.maps;
        }
        if (resp.maps.length < SEARCH_LIMIT) {
          this.store.hasMore = false;
        }
      });
    }
  }
}
