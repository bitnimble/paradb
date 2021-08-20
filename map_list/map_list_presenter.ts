import { action, computed, observable, reaction, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { PDMap } from 'paradb-api-schema';

export class MapListStore {
  @observable.ref
  filterQuery: string = '';

  /** Private, debounced version of `filterQuery` */
  @observable.ref
  private filter: string = this.filterQuery;

  @observable.shallow
  private _maps?: PDMap[];

  constructor() {
    reaction(
        () => this.filterQuery, //
        q => this.filter = q.toLowerCase(), //
        { delay: 100 },
    );
  }

  @action.bound
  setMaps(maps: PDMap[]) {
    this._maps = maps;
  }

  @computed
  get maps() {
    return this._maps?.filter(m =>
        m.artist.toLowerCase().includes(this.filter)
        || m.title.toLowerCase().includes(this.filter),
    );
  }
}

export class MapListPresenter {
  constructor(private readonly api: Api, private readonly store: MapListStore) {
  }

  @action.bound
  onChangeFilterQuery(val: string) {
    this.store.filterQuery = val;
  }

  async findMaps() {
    const resp = await this.api.findMaps();
    if (!resp.success) {
      throw new Error();
    }
    runInAction(() => this.store.setMaps(resp.maps));
  }
}
