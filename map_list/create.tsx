import { createTable } from 'base/table/create';
import { Row } from 'base/table/table';
import classNames from 'classnames';
import { action, computed } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import metrics from 'pages/paradb/base/metrics/metrics.css';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { DifficultyColorPills, MapList } from 'pages/paradb/map_list/map_list';
import { MapListPresenter, MapListStore } from 'pages/paradb/map_list/map_list_presenter';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { PDMap, serializeMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_list.css';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const shortMonth = months[date.getMonth()];
  const maybeYear = date.getFullYear() !== new Date().getFullYear()
    ? `, ${date.getFullYear()}`
    : '';
  return `${shortMonth} ${date.getDate()}${maybeYear}`;
};

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

  const getRow = (map: PDMap): Row<6> => {
    const onSelect = action((e: React.MouseEvent<HTMLAnchorElement>) => {
      captureSkeletonScroll();
      if (!store.enableBulkSelect) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      presenter.toggleMapSelection(map.id, e.shiftKey);
    });
    const wrapWithMapRoute = (contents: React.ReactNode, additionalClassName?: string) => (
      <RouteLink
        additionalClassName={classNames(styles.mapListCell, additionalClassName)}
        to={routeFor([RoutePath.MAP, map.id])}
        state={serializeMap(map)}
        onClick={onSelect}
      >
        {contents}
      </RouteLink>
    );
    return {
      className: classNames({ [styles.mapListRowSelected]: presenter.isSelected(map.id) }),
      Cells: [
        React.memo(() => wrapWithMapRoute(<T.Small>{map.title}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.artist}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.author}</T.Small>)),
        React.memo(() =>
          wrapWithMapRoute(
            <DifficultyColorPills difficulties={map.difficulties}/>,
            styles.centeredCell,
          )
        ),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.favorites}</T.Small>, styles.centeredCell)),
        React.memo(() =>
          wrapWithMapRoute(<T.Small>{formatDate(map.submissionDate)}</T.Small>, styles.centeredCell)
        ),
      ],
    };
  };

  const { store: tableStore, Component: Table } = createTable({
    data: computed(() => store.maps),
    columns: [
      { content: <T.Small weight="bold">Song title</T.Small>, sortLabel: 'title' },
      { content: <T.Small weight="bold">Artist</T.Small>, sortLabel: 'artist' },
      { content: <T.Small weight="bold">Mapper</T.Small>, sortLabel: 'author' },
      {
        content: <T.Small weight="bold">Difficulties</T.Small>,
        width: `calc(${metrics.gridBaseline} * 20)`,
      },
      {
        content: <T.Small weight="bold">Favorites</T.Small>,
        sortLabel: 'favorites',
        width: `calc(${metrics.gridBaseline} * 20)`,
      },
      {
        content: <T.Small weight="bold">Upload date</T.Small>,
        sortLabel: 'submissionDate',
        width: `calc(${metrics.gridBaseline} * 20)`,
      },
    ],
    rowMapper: getRow,
    onSortChange: presenter.onSortChanged,
    tableClassname: styles.mapListTable,
    rowClassname: styles.mapListRow,
    defaultSortColumn: 5,
    defaultSortDirection: 'desc',
  });
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
