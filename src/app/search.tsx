'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { Button } from 'ui/base/button/button';
import { searchIcon } from 'ui/base/icons/search_icon';
import { Textbox } from 'ui/base/textbox/textbox';

export const Search = (props: { query: string }) => {
  const [searchQuery, setSearchQuery] = React.useState(props.query);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onSearch = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (searchQuery.trim() === '') {
      current.delete('q');
    } else {
      current.set('q', searchQuery.trim());
    }

    const newQuery = current.toString();
    const newQueryTrimmed = newQuery === '' ? '' : `?${newQuery}`;
    router.push(`${pathname}${newQueryTrimmed}`);
  };

  return (
    <>
      <Textbox
        error={undefined}
        value={searchQuery}
        borderColor="purple"
        borderWidth={2}
        placeholder="Search for a song or artist..."
        onChange={setSearchQuery}
        onSubmit={onSearch}
      />
      <Button onClick={onSearch}>{searchIcon} Search</Button>
    </>
  );
};
