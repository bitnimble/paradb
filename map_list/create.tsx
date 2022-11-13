import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { createMapListTable, MapList } from 'pages/paradb/map_list/map_list';
import { MapListPresenter, MapListStore } from 'pages/paradb/map_list/map_list_presenter';
import React from 'react';

export function createMapList(api: Api) {
  const store = new MapListStore();
  const presenter = new MapListPresenter(api, store);

  // When navigating away from the map list, we store the current skeleton scroll offset - if this component
  // is remounted, we restore it.
  let captureSkeletonScroll: () => void = () => void 0;
  let restoreSkeletonScroll: () => void = () => void 0;
  const setSkeletonRef: React.Ref<HTMLDivElement> = (ref: HTMLDivElement | null) => {
    let skeletonScroll: number | undefined;
    captureSkeletonScroll = () => {
      skeletonScroll = ref?.scrollTop;
    };
    restoreSkeletonScroll = () => {
      if (ref && skeletonScroll) {
        ref.scrollTop = skeletonScroll;
      }
    };
  };

  const { tableStore, Table } = createMapListTable(captureSkeletonScroll, store, presenter);
  presenter.setTableStore(tableStore);

  const onMapListMount = () => {
    restoreSkeletonScroll();
    if (store.maps == null) {
      presenter.onSearch();
    }
  };

  return {
    setSkeletonRef,
    MapList: observer(() => (
      <MapList
        Table={Table}
        bulkSelectEnabled={store.enableBulkSelect}
        selectionCount={store.selectedMaps.size}
        filterQuery={store.query}
        hasMore={store.hasMore}
        loadingMore={store.loadingMore}
        onSearch={presenter.onSearch}
        onMount={() => onMapListMount()}
        onClickBulkSelect={presenter.onClickBulkSelect}
        onClickBulkDownload={presenter.onClickBulkDownload}
        onClickCancelBulkSelect={presenter.onClickCancelBulkSelect}
        onChangeQuery={presenter.onChangeQuery}
        onLoadMore={presenter.onLoadMore}
      />
    )),
  };
}
