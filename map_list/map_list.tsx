import { createTable } from 'base/table/create';
import { Row } from 'base/table/table';
import classNames from 'classnames';
import { action, computed, observable, reaction } from 'mobx';
import { observer } from 'mobx-react';
import metrics from 'pages/paradb/base/metrics/metrics.css';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { difficultyColors, KnownDifficulty, parseDifficulty } from 'pages/paradb/map/map_page';
import { MapListPresenter, MapListStore } from 'pages/paradb/map_list/map_list_presenter';
import { searchIcon } from 'pages/paradb/map_list/search_icon';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { Difficulty, PDMap, serializeMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_list.css';

type Props = {
  Table: React.ComponentType,
  filterQuery: string,
  hasMore: boolean,
  loadingMore: boolean,
  bulkSelectEnabled: boolean,
  selectionCount: number,
  onMount(): void,
  onClickBulkSelect(): void,
  onClickBulkDownload(): void,
  onClickCancelBulkSelect(): void,
  onChangeQuery(val: string): void,
  onSearch(): void,
  onLoadMore(): void,
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

export function createMapListTable(
  captureSkeletonScroll: () => void,
  store: MapListStore,
  presenter: MapListPresenter,
) {
  const getRow = (map: PDMap): Row<7> => {
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
        additionalClassName={classNames(styles.routeLink, additionalClassName)}
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
        React.memo(() => <DifficultyColorPills difficulties={map.difficulties}/>),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.title}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.artist}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.author}</T.Small>)),
        React.memo(() => wrapWithMapRoute(<T.Small>{map.favorites}</T.Small>, styles.centeredCell)),
        React.memo(() =>
          wrapWithMapRoute(<T.Small>{map.downloadCount}</T.Small>, styles.centeredCell)
        ),
        React.memo(() =>
          wrapWithMapRoute(<T.Small>{formatDate(map.submissionDate)}</T.Small>, styles.centeredCell)
        ),
      ],
    };
  };

  const { store: tableStore, Component } = createTable({
    data: computed(() => store.maps),
    columns: [
      { content: <div></div>, style: { minWidth: '8px', width: '8px' } },
      { content: <T.Small weight="bold">Song title</T.Small>, sortLabel: 'title' },
      { content: <T.Small weight="bold">Artist</T.Small>, sortLabel: 'artist' },
      { content: <T.Small weight="bold">Mapper</T.Small>, sortLabel: 'author' },
      {
        content: <T.Small weight="bold">Favorites</T.Small>,
        sortLabel: 'favorites',
        style: { width: `calc(${metrics.gridBaseline} * 15)` },
      },
      {
        content: <T.Small weight="bold">Downloads</T.Small>,
        sortLabel: 'downloadCount',
        style: { width: `calc(${metrics.gridBaseline} * 15)` },
      },
      {
        content: <T.Small weight="bold">Upload date</T.Small>,
        sortLabel: 'submissionDate',
        style: { width: `calc(${metrics.gridBaseline} * 20)` },
      },
    ],
    rowMapper: getRow,
    onSortChange: presenter.onSortChanged,
    tableClassname: styles.mapListTable,
    rowClassname: styles.mapListRow,
    cellClassname: styles.mapListCell,
    defaultSortColumn: 6,
    defaultSortDirection: 'desc',
  });

  const scrollableTable = observable.box(false);
  const tableScrollContainerRef = React.createRef<HTMLDivElement>();
  reaction(() => store.maps, () => {
    requestAnimationFrame(() => {
      if (
        tableScrollContainerRef.current && tableScrollContainerRef
            .current
            .scrollWidth > tableScrollContainerRef
            .current
            .clientWidth
      ) {
        tableScrollContainerRef.current.classList.add(styles.isScrollable);
      }
    });
  });

  return {
    tableStore,
    Table: observer(() => (
      <div
        ref={tableScrollContainerRef}
        className={classNames(
          styles.tableScrollContainer,
          scrollableTable.get() && styles.isScrollable,
        )}
      >
        <Component/>
      </div>
    )),
  };
}

export const DifficultyColorPills = (props: { difficulties: Difficulty[] }) => {
  const difficulties = new Set(props.difficulties.map(d => parseDifficulty(d.difficultyName)));
  const color = (d: KnownDifficulty) => difficulties.has(d) ? difficultyColors[d] : undefined;
  return (
    <div className={styles.difficulties}>
      <div
        className={classNames(
          styles.difficultyColorPill,
          !color('expert') && !color('expert+') && styles.greyPill,
        )}
        style={{ backgroundColor: color('expert') || color('expert+') }}
      >
      </div>
      <div
        className={classNames(styles.difficultyColorPill, !color('hard') && styles.greyPill)}
        style={{ backgroundColor: color('hard') }}
      >
      </div>
      <div
        className={classNames(styles.difficultyColorPill, !color('medium') && styles.greyPill)}
        style={{ backgroundColor: color('medium') }}
      >
      </div>
      <div
        className={classNames(styles.difficultyColorPill, !color('easy') && styles.greyPill)}
        style={{ backgroundColor: color('easy') }}
      >
      </div>
    </div>
  );
};

@observer
export class MapList extends React.Component<Props> {
  componentDidMount() {
    const { onMount } = this.props;
    onMount();
  }

  private readonly BulkSelectActions = () => {
    const {
      bulkSelectEnabled,
      selectionCount,
      onClickBulkSelect,
      onClickBulkDownload,
      onClickCancelBulkSelect,
    } = this.props;
    return bulkSelectEnabled
      ? (
        <>
          <Button onClick={onClickBulkDownload}>⭳ {selectionCount}</Button>
          <Button onClick={onClickCancelBulkSelect}>Cancel</Button>
        </>
      )
      : <Button onClick={onClickBulkSelect}>Bulk select</Button>;
  };

  render() {
    const {
      bulkSelectEnabled,
      Table,
      filterQuery,
      hasMore,
      loadingMore,
      onChangeQuery,
      onSearch,
      onLoadMore,
    } = this.props;
    return (
      <div className={styles.mapList}>
        <div className={styles.filter}>
          <Textbox
            error={undefined}
            value={filterQuery}
            borderColor="purple"
            borderWidth={2}
            placeholder="Search for a song or artist..."
            onChange={onChangeQuery}
            onSubmit={onSearch}
          />
          <Button onClick={onSearch}>{searchIcon} Search</Button>
          <this.BulkSelectActions/>
        </div>
        <div
          className={classNames(
            styles.tableContainer,
            bulkSelectEnabled && styles.bulkSelectEnabled,
          )}
        >
          <Table/>
          {hasMore && (
            <Button className={styles.loadMoreButton} onClick={onLoadMore} loading={loadingMore}>
              Load more
            </Button>
          )}
        </div>
      </div>
    );
  }
}
