import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { computedFn } from 'mobx-utils';
import { Api } from 'pages/paradb/base/api/api';
import { getMapFileLink } from 'pages/paradb/utils/maps';
import { PDMap } from 'paradb-api-schema';

export class MapListStore {
  enableBulkSelect = false;
  filterQuery: string = '';
  selectedMaps = new Set<string>();

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

  toggleMapSelection(id: string) {
    const exists = this.store.selectedMaps.has(id);
    if (exists) {
      this.store.selectedMaps.delete(id);
    } else {
      this.store.selectedMaps.add(id);
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
