'use client';

import { useApi } from 'app/api/api_provider';
import { MapListPresenter, MapListStore } from 'app/map_list_presenter';
import { useSkeletonRef } from 'app/skeleton_provider';
import classNames from 'classnames';
import { Check } from 'lucide-react';
import { action, computed, observable, reaction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { decodeFilter } from 'schema/map_filter';
import { Difficulty, PDMap } from 'schema/maps';
import { Button } from 'ui/base/button/button';
import { metrics } from 'ui/base/design_system/design_tokens';
import { Row, Table } from 'ui/base/table/table';
import { TableSortStore, TableStore } from 'ui/base/table/table_presenter';
import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { useInfiniteScroll } from 'ui/hooks/use_infinite_scroll';
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
  const store = useLocalObservable(() => {
    const rawFilter = searchParams.get('filter');
    const decoded = rawFilter ? decodeFilter(rawFilter) : undefined;
    const initialFilter = decoded?.success ? decoded.value : undefined;
    return new MapListStore(
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
            style: { width: `${metrics.gridBaseline * 15}px` },
          },
          {
            content: <T.Small weight="bold">Downloads</T.Small>,
            sortLabel: 'downloadCount',
            style: { width: `${metrics.gridBaseline * 15}px` },
          },
          {
            content: <T.Small weight="bold">Upload date</T.Small>,
            sortLabel: 'submissionDate',
            style: { width: `${metrics.gridBaseline * 20}px` },
          },
          // Trailing selection column; only shows a checkbox when bulk select is enabled.
          { content: <div></div> },
        ],
        6,
        'desc'
      ),
      initialFilter
    );
  });
  const presenter = useMemo(() => new MapListPresenter(api, store), [api, store]);

  const skeletonRef = useSkeletonRef();
  useInfiniteScroll(skeletonRef, () => {
    if (store.hasMore && !store.loadingMore) {
      presenter.onLoadMore();
    }
  });

  useEffect(() => {
    presenter.onSearch('search');
  }, [presenter]);

  return (
    <div className={styles.mapList}>
      <div className={styles.filter}>
        <Search store={store} presenter={presenter} />
      </div>
      <div
        className={classNames(
          styles.tableContainer,
          store.enableBulkSelect && styles.bulkSelectEnabled
        )}
      >
        <MapListTable store={store} presenter={presenter} />
        {store.hasMore && (
          <div className={styles.loadMoreContainer}>
            <Button onClick={presenter.onLoadMore} loading={store.loadingMore}>
              Load more
            </Button>
          </div>
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
  useEffect(() => {
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

  const getRow = (map: PDMap): Row<8> => {
    const selected = presenter.isSelected(map.id);
    const onSelect = action((e: React.MouseEvent) => {
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
        prefetch={false}
      >
        {contents}
      </RouteLink>
    );
    return {
      className: classNames({ [styles.mapListRowSelected]: selected }),
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
        React.memo(() =>
          store.enableBulkSelect ? (
            <div
              className={classNames(styles.selectBox, { [styles.selectBoxChecked]: selected })}
              onClick={onSelect}
            >
              {selected && <Check />}
            </div>
          ) : null
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
