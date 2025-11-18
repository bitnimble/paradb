'use client';

import { useApi } from 'app/api/api_provider';
import { MapListPresenter, MapListStore } from 'app/map_list_presenter';
import classNames from 'classnames';
import { action, computed, observable, reaction, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { Difficulty, PDMap } from 'schema/maps';
import { Button } from 'ui/base/button/button';
import metrics from 'ui/base/metrics/metrics.module.css';
import { Row, Table } from 'ui/base/table/table';
import { TableSortStore, TableStore } from 'ui/base/table/table_presenter';
import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { KnownDifficulty, difficultyColors, parseDifficulty } from 'utils/difficulties';
import { RoutePath, routeFor } from 'utils/routes';
import styles from './page.module.css';
import { Search } from './search';

export default function Page() {
  return (
    <Suspense fallback={<div></div>}>
      <Home />
    </Suspense>
  );
}

const Home = observer(() => {
  const api = useApi();
  const searchParams = useSearchParams();
  const [store] = useState(
    new MapListStore(
      searchParams.get('q') || '',
      new TableSortStore(
        [
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
        6,
        'desc'
      )
    )
  );
  const [presenter] = useState(() => new MapListPresenter(api, store));

  React.useEffect(() => {
    if (store.maps == null) {
      presenter.onSearch('search');
    }
  }, []);

  const BulkSelectActions = observer(() => {
    return store.enableBulkSelect ? (
      <>
        <Button onClick={presenter.onClickBulkDownload}>⭳ {store.selectedMaps.size}</Button>
        <Button onClick={presenter.onClickCancelBulkSelect}>Cancel</Button>
      </>
    ) : (
      <Button onClick={presenter.onClickBulkSelect}>Bulk select</Button>
    );
  });

  return (
    <div className={styles.mapList}>
      <div className={styles.filter}>
        <Search store={store} onSearch={() => presenter.onSearch('search')} />
        <BulkSelectActions />
      </div>
      <div
        className={classNames(
          styles.tableContainer,
          store.enableBulkSelect && styles.bulkSelectEnabled
        )}
      >
        <MapListTable store={store} presenter={presenter} />
        {store.hasMore && (
          <Button
            className={styles.loadMoreButton}
            onClick={presenter.onLoadMore}
            loading={store.loadingMore}
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );

  // TODO: restore scroll-saving behaviour
});

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const shortMonth = months[date.getMonth()];
  const maybeYear =
    date.getFullYear() !== new Date().getFullYear() ? `, ${date.getFullYear()}` : '';
  return `${shortMonth} ${date.getDate()}${maybeYear}`;
};

const MapListTable = observer((props: { store: MapListStore; presenter: MapListPresenter }) => {
  const { store, presenter } = props;
  const scrollableTable = observable.box(false);
  const tableScrollContainerRef = React.createRef<HTMLDivElement>();
  // TODO: avoid mixing mobx and hooks
  React.useEffect(() => {
    const dispose = reaction(
      () => store.maps,
      () => {
        requestAnimationFrame(() => {
          if (
            tableScrollContainerRef.current &&
            tableScrollContainerRef.current.scrollWidth >
              tableScrollContainerRef.current.clientWidth
          ) {
            tableScrollContainerRef.current.classList.add(styles.isScrollable);
          }
        });
      }
    );
    return () => dispose();
  }, []);

  const [tableStore] = useState(() => new TableStore(computed(() => store.maps)));

  const getRow = (map: PDMap): Row<7> => {
    const onSelect = action((e: React.MouseEvent<HTMLAnchorElement>) => {
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
        href={routeFor([RoutePath.MAP, map.id])}
        onClick={onSelect}
      >
        {contents}
      </RouteLink>
    );
    return {
      className: classNames({ [styles.mapListRowSelected]: presenter.isSelected(map.id) }),
      Cells: [
        React.memo(() => <DifficultyColorPills difficulties={map.difficulties} />),
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

  return (
    <div
      ref={tableScrollContainerRef}
      className={classNames(
        styles.tableScrollContainer,
        scrollableTable.get() && styles.isScrollable
      )}
    >
      <Table
        store={tableStore}
        sortStore={store.tableSortStore}
        rowMapper={getRow}
        tableClassname={styles.mapListTable}
        rowClassname={styles.mapListRow}
        cellClassname={styles.mapListCell}
        onSortChange={presenter.onSortChanged}
      />
    </div>
  );
});

const DifficultyColorPills = (props: { difficulties: Difficulty[] }) => {
  const difficulties = new Set(props.difficulties.map((d) => parseDifficulty(d.difficultyName)));
  const color = (d: KnownDifficulty) => (difficulties.has(d) ? difficultyColors[d] : undefined);
  return (
    <div className={styles.difficulties}>
      <div
        className={classNames(
          styles.difficultyColorPill,
          !color('expert') && !color('expert+') && styles.greyPill
        )}
        style={{ backgroundColor: color('expert') || color('expert+') }}
      ></div>
      <div
        className={classNames(styles.difficultyColorPill, !color('hard') && styles.greyPill)}
        style={{ backgroundColor: color('hard') }}
      ></div>
      <div
        className={classNames(styles.difficultyColorPill, !color('medium') && styles.greyPill)}
        style={{ backgroundColor: color('medium') }}
      ></div>
      <div
        className={classNames(styles.difficultyColorPill, !color('easy') && styles.greyPill)}
        style={{ backgroundColor: color('easy') }}
      ></div>
    </div>
  );
};
