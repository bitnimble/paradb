'use client';

import { ActiveFilterPills, FilterBuilder } from 'app/filter_builder';
import { MapListPresenter, MapListStore } from 'app/map_list_presenter';
import classNames from 'classnames';
import { Download, Filter, Search as SearchIcon } from 'lucide-react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { encodeFilter } from 'schema/map_filter';
import { Button } from 'ui/base/button/button';
import { Textbox } from 'ui/base/textbox/textbox';
import styles from './search.module.css';

export const Search = observer((props: { store: MapListStore; presenter: MapListPresenter }) => {
  const { store, presenter } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSearch = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (store.query.trim() === '') {
      current.delete('q');
    } else {
      current.set('q', store.query.trim());
    }

    const filter = store.activeFilter;
    if (filter) {
      current.set('filter', encodeFilter(filter));
    } else {
      current.delete('filter');
    }

    const newQuery = current.toString();
    router.push(`${pathname}${newQuery === '' ? '' : `?${newQuery}`}`);

    presenter.onSearch('search');
  };

  const filterToggle = (
    <button
      type="button"
      aria-label="Toggle filters"
      className={classNames(styles.filterToggle, {
        [styles.filterToggleActive]: store.filtersExpanded,
      })}
      onClick={action(() => (store.filtersExpanded = !store.filtersExpanded))}
    >
      <Filter />
    </button>
  );

  const BulkSelectActions = observer(() => {
    return store.enableBulkSelect ? (
      <>
        <Button onClick={presenter.onClickBulkDownload}>
          <Download /> {store.selectedMaps.size}
        </Button>
        <Button onClick={presenter.onClickCancelBulkSelect}>Cancel</Button>
      </>
    ) : (
      <Button onClick={presenter.onClickBulkSelect}>Bulk select</Button>
    );
  });

  return (
    <div className={styles.searchArea}>
      <div className={styles.searchRow}>
        <Textbox
          className={styles.searchTextbox}
          error={undefined}
          value={store.query}
          borderColor="purple"
          borderWidth={2}
          placeholder="Search for a song or artist..."
          onChange={action((val) => (store.query = val))}
          onSubmit={onSearch}
          trailing={filterToggle}
        />
        <Button onClick={onSearch}>
          <SearchIcon /> Search
        </Button>
        <BulkSelectActions />
      </div>
      {!store.filtersExpanded && <ActiveFilterPills store={store} onSearch={onSearch} />}
      {store.filtersExpanded && <FilterBuilder store={store} onSearch={onSearch} />}
    </div>
  );
});
