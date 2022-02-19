import { checkExists } from 'base/preconditions';
import { TableStore } from 'base/table/table_presenter';
import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { computedFn } from 'mobx-utils';
import { Api } from 'pages/paradb/base/api/api';
import { getMapFileLink } from 'pages/paradb/utils/maps';
import { PDMap } from 'paradb-api-schema';

export class MapListStore {
  enableBulkSelect = false;
  filterQuery: string = '';
  selectedMaps = new Set<string>();
  lastSelectedMapIndex: number | undefined;

  /** Private, debounced version of `filterQuery` */
  private filter: string = this.filterQuery;

  private _maps?: PDMap[];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    reaction(
        () => this.filterQuery, //
        q => this.filter = q.toLowerCase(), //
        { delay: 100 },
    );
  }

  setMaps(maps: PDMap[]) {
    this._maps = maps;
  }

  get maps() {
    return this._maps?.filter(m =>
        m.artist.toLowerCase().includes(this.filter)
        || m.title.toLowerCase().includes(this.filter),
    );
  }

  get allMaps() {
    return this._maps;
  }
}

export class MapListPresenter {
  constructor(private readonly api: Api, private readonly store: MapListStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  toggleMapSelection(tableStore: TableStore<PDMap, number>, id: string, shiftKeyHeld: boolean) {
    // Take into account table filtering + sorting, when doing index lookups
    const exists = this.store.selectedMaps.has(id);
    const index = checkExists(tableStore.sortedData).findIndex(m => m.id === id);

    if (shiftKeyHeld && this.store.lastSelectedMapIndex != null && index > this.store.lastSelectedMapIndex) {
      for (let i = this.store.lastSelectedMapIndex + 1; i <= index; i++) {
        this.store.selectedMaps.add(checkExists(tableStore.sortedData)[i].id);
      }
      this.store.lastSelectedMapIndex = index;
    } else {
      if (exists) {
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

  onClickBulkDownload() {
    const a = document.createElement('a');
    a.style.display = 'none';
    document.body.appendChild(a);

    this.store.selectedMaps.forEach(id => {
      // It's probably faster to just loop and find in the event that they bulk download,
      // rather than have a cache for ID -> Map.
      const title = this.store.allMaps?.find(map => map.id === id)?.title;
      a.setAttribute('href', getMapFileLink(id));
      a.setAttribute('download', title ? `${title}.zip` : '');
      a.click();
    });

    a.remove();
  }

  onClickCancelBulkSelect() {
    this.store.enableBulkSelect = false;
    this.store.selectedMaps.clear();
  }

  readonly isSelected = computedFn((id: string) => {
    return this.store.enableBulkSelect && this.store.selectedMaps.has(id)
  });

  onChangeFilterQuery(val: string) {
    this.store.filterQuery = val;
    this.store.lastSelectedMapIndex = undefined;
  }

  onTableSortChange() {
    this.store.lastSelectedMapIndex = undefined;
  }

  async loadAllMaps() {
    if (this.store.maps != null) {
      return;
    }
    const resp = await this.api.findMaps();
    if (!resp.success) {
      throw new Error();
    }
    runInAction(() => this.store.setMaps(resp.maps));
  }
}
