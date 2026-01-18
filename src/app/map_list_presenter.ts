import { Api } from 'app/api/api';
import { checkExists } from 'base/preconditions';
import { makeAutoObservable, runInAction } from 'mobx';
import { computedFn } from 'mobx-utils';
import { MapSortableAttributes, PDMap, mapSortableAttributes } from 'schema/maps';
import { TableSortStore } from 'ui/base/table/table_presenter';
import { ToastIntent, showToast } from 'ui/base/toast/toast';
import { getMapFileLink } from 'utils/maps';

const SEARCH_LIMIT = 20;

export class MapListStore {
  enableBulkSelect = false;
  query: string = '';
  selectedMaps = new Set<string>();
  lastSelectedMapIndex?: number = undefined;
  maps?: PDMap[] = undefined;
  hasMore = true;
  loadingMore = false;

  constructor(
    query: string,
    readonly tableSortStore: TableSortStore<PDMap, 7>
  ) {
    this.query = query;
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
    showToast('Test toast', ToastIntent.DEFAULT);
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
    const tableStore = checkExists(this.store.tableSortStore);
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
    if (trigger === 'search' && this.store.query !== '') {
      runInAction(() => {
        this.store.tableSortStore.sortColumn = undefined;
        this.store.tableSortStore.sortDirection = undefined;
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
