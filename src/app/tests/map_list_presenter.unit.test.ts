import { Api } from 'app/api/api';
import { MapListPresenter, MapListStore } from 'app/map_list_presenter';
import { FindMapsResponse, PDMap, SearchMapsRequest } from 'schema/maps';
import type { Columns } from 'ui/base/table/table';
import { TableSortStore } from 'ui/base/table/table_presenter';

// SEARCH_LIMIT in map_list_presenter.ts (kept in sync here; it isn't exported).
const SEARCH_LIMIT = 20;

const makeMap = (id: string) => ({ id }) as unknown as PDMap;

function createMapListStore() {
  // sortColumn is cleared on search, and these tests never sort, so the columns are unused.
  const sortStore = new TableSortStore<PDMap, 7>([] as unknown as Columns<PDMap, 7>, 0, 'desc');
  return new MapListStore('', sortStore);
}

// Serves a fixed total number of maps, honouring the requested offset/limit so it models a real
// paged backend.
class FakeSearchApi {
  constructor(private readonly total: number) {}
  searchMaps(req: SearchMapsRequest): Promise<FindMapsResponse> {
    const available = Math.max(0, this.total - req.offset);
    const maps = Array.from({ length: Math.min(req.limit, available) }, (_, i) =>
      makeMap(`m${req.offset + i}`)
    );
    return Promise.resolve({ success: true, maps, totalCount: this.total });
  }
}

// Defers every searchMaps response so the test can resolve them out of order and reproduce races.
class FakeDeferredSearchApi {
  readonly calls: Array<{ req: SearchMapsRequest; resolve: (maps: PDMap[]) => void }> = [];
  searchMaps(req: SearchMapsRequest): Promise<FindMapsResponse> {
    return new Promise((resolve) => {
      this.calls.push({
        req,
        resolve: (maps) => resolve({ success: true, maps, totalCount: maps.length }),
      });
    });
  }
}

describe('MapListPresenter pagination', () => {
  it('does not report hasMore when the result count exactly fills one page', async () => {
    const store = createMapListStore();
    const presenter = new MapListPresenter(
      new FakeSearchApi(SEARCH_LIMIT) as unknown as Api,
      store
    );

    presenter.onChangeQuery('anything');
    await presenter.onSearch('search');

    expect(store.maps).toHaveLength(SEARCH_LIMIT);
    expect(store.hasMore).toBe(false);
  });

  it('discards an in-flight load-more when a new search replaces the results', async () => {
    const store = createMapListStore();
    const api = new FakeDeferredSearchApi();
    const presenter = new MapListPresenter(api as unknown as Api, store);

    // Initial search resolves with a short page.
    presenter.onChangeQuery('first');
    const firstSearch = presenter.onSearch('search');
    api.calls[0].resolve([makeMap('a'), makeMap('b')]);
    await firstSearch;
    expect(store.maps).toEqual([makeMap('a'), makeMap('b')]);

    // Start loading more, but leave it in flight.
    const loadMore = presenter.onLoadMore();

    // A new search starts and finishes first, replacing the result set.
    presenter.onChangeQuery('second');
    const secondSearch = presenter.onSearch('search');
    api.calls[2].resolve([makeMap('c')]);
    await secondSearch;
    expect(store.maps).toEqual([makeMap('c')]);

    // The stale load-more now resolves; its page belongs to the old query and must be discarded.
    api.calls[1].resolve([makeMap('stale')]);
    await loadMore;
    expect(store.maps).toEqual([makeMap('c')]);
  });
});
