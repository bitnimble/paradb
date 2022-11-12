import classNames from 'classnames';
import { observer } from 'mobx-react';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { getDifficultyColor } from 'pages/paradb/map/map_page';
import { searchIcon } from 'pages/paradb/map_list/search_icon';
import { Difficulty } from 'paradb-api-schema';
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

export const DifficultyColorPills = (props: { difficulties: Difficulty[] }) => (
  <div className={styles.difficulties}>
    {props
      .difficulties
      .map((d, i) => (
        <div
          key={i}
          className={styles.difficultyColorPill}
          style={{ backgroundColor: getDifficultyColor(d.difficultyName) }}
        >
        </div>
      ))}
  </div>
);

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
          {hasMore && <Button onClick={onLoadMore} loading={loadingMore}>Load more</Button>}
        </div>
      </div>
    );
  }
}
