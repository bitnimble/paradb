import { createTable } from 'base/table/create';
import { Row } from 'base/table/table';
import classNames from 'classnames';
import { action, computed } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { ComplexityColorPills, MapList } from 'pages/paradb/map_list/map_list';
import { MapListPresenter, MapListStore } from 'pages/paradb/map_list/map_list_presenter';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { PDMap, serializeMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_list.css';
import metrics from 'pages/paradb/base/metrics/metrics.css';

const naturalSort = (getProp: (map: PDMap) => string | undefined) => {
  return (a: PDMap, b: PDMap) => {
    let _a = getProp(a) || '';
    let _b = getProp(b) || '';
    return _a.localeCompare(_b, undefined, { numeric: true });
  };
};
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

  const getRow = (map: PDMap): Row<5> => {
    const onSelect = action((e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!store.enableBulkSelect) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      presenter.toggleMapSelection(tableStore, map.id, e.shiftKey);
    });
    const wrapWithMapRoute = (contents: React.ReactNode, additionalClassName?: string) => (
        <RouteLink
            additionalClassName={classNames(styles.mapListCell, additionalClassName)}
            to={{
              pathname: routeFor([RoutePath.MAP, map.id]),
              state: serializeMap(map),
            }}
            onClick={onSelect}
        >
          {contents}
        </RouteLink>
    );
    return {
      className: classNames({
        [styles.mapListRowSelected]: presenter.isSelected(map.id),
      }),
      Cells: [
        React.memo(() => wrapWithMapRoute(<T.Small>{map.title}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.artist}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.author}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<ComplexityColorPills complexities={map.complexities}/>)),
        React.memo(() =>
            wrapWithMapRoute(
                <T.Small>{formatDate(map.submissionDate)}</T.Small>,
                styles.uploadDateCell,
            ),
        ),
      ],
    };
  };

  const { store: tableStore, Component: Table } = createTable({
    data: computed(() => store.maps),
    columns: [
      {
        content: <T.Small weight="bold">Song title</T.Small>,
        sort: naturalSort(m => m.title),
      },
      {
        content: <T.Small weight="bold">Artist</T.Small>,
        sort: naturalSort(m => m.artist),
      },
      {
        content: <T.Small weight="bold">Mapper</T.Small>,
        sort: naturalSort(m => m.author),
      },
      {
        content: <T.Small weight="bold">Difficulties</T.Small>,
        sort: naturalSort(m => m.complexities.map(c => c.complexityName).join()),
        width: `calc(${metrics.gridBaseline} * 13)`,
      },
      {
        content: <T.Small weight="bold">Upload date</T.Small>,
        sort: (a, b) => a.submissionDate.localeCompare(b.submissionDate),
      },
    ],
    rowMapper: getRow,
    fetchData: presenter.loadAllMaps,
    onSortChange: presenter.onTableSortChange,
    tableClassname: styles.mapListTable,
    rowClassname: styles.mapListRow,
    defaultSortColumn: 3,
    defaultSortDirection: 'desc',
  });

  return observer(() => (
      <MapList
          Table={Table}
          bulkSelectEnabled={store.enableBulkSelect}
          selectionCount={store.selectedMaps.size}
          filterQuery={store.filterQuery}
          onMount={presenter.loadAllMaps}
          onClickBulkSelect={presenter.onClickBulkSelect}
          onClickBulkDownload={presenter.onClickBulkDownload}
          onClickCancelBulkSelect={presenter.onClickCancelBulkSelect}
          onChangeFilterQuery={presenter.onChangeFilterQuery}
      />
  ));
}
