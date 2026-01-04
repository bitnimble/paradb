'use client';

import { MapListStore } from 'app/map_list_presenter';
import { action } from 'mobx';
import { observer } from 'mobx-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from 'ui/base/button/button';
import { searchIcon } from 'ui/base/icons/search_icon';
import { Textbox } from 'ui/base/textbox/textbox';

export const Search = observer((props: { store: MapListStore; onSearch: () => void }) => {
  const { store } = props;
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

    const newQuery = current.toString();
    const newQueryTrimmed = newQuery === '' ? '' : `?${newQuery}`;
    router.push(`${pathname}${newQueryTrimmed}`);

    props.onSearch();
  };

  return (
    <>
      <Textbox
        error={undefined}
        value={store.query}
        borderColor="purple"
        borderWidth={2}
        placeholder="Search for a song or artist..."
        onChange={action((val) => (store.query = val))}
        onSubmit={onSearch}
      />
      <Button onClick={onSearch}>{searchIcon} Search</Button>
    </>
  );
});
