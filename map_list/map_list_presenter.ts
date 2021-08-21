import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'paradb-api-schema';

export class MapListStore {
  filterQuery: string = '';

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
}

export class MapListPresenter {
  constructor(private readonly api: Api, private readonly store: MapListStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  onChangeFilterQuery(val: string) {
    this.store.filterQuery = val;
  }

  async fetchInitialMaps() {
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
