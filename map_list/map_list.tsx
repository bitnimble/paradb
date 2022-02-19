import classNames from 'classnames';
import { observer } from 'mobx-react';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import React from 'react';
import styles from './map_list.css';

type Props = {
  Table: React.ComponentType,
  filterQuery: string,
  bulkSelectEnabled: boolean,
  selectionCount: number,
  onMount(): void,
  onClickBulkSelect(): void,
  onClickBulkDownload(): void,
  onClickCancelBulkSelect(): void,
  onChangeFilterQuery(val: string): void,
};

@observer
export class MapList extends React.Component<Props> {
  componentDidMount() {
    this.props.onMount();
  }

  private readonly BulkSelectActions = () => {
    const { bulkSelectEnabled, selectionCount, onClickBulkSelect, onClickBulkDownload, onClickCancelBulkSelect } = this.props;
    return bulkSelectEnabled
      ? (
        <>
          <Button onClick={onClickBulkDownload}>⭳ {selectionCount}</Button>
          <Button onClick={onClickCancelBulkSelect}>Cancel</Button>
        </>
      )
      : (
        <Button onClick={onClickBulkSelect}>Bulk select</Button>
      );
  };

  render() {
    const { bulkSelectEnabled, Table, filterQuery, onChangeFilterQuery } = this.props;
    return (
        <div className={styles.mapList}>
          <div className={styles.filter}>
            <Textbox
                error={undefined}
                search={true}
                value={filterQuery}
                borderColor="purple"
                borderWidth={2}
                placeholder="Search for a song or artist..."
                onChange={onChangeFilterQuery}
            />
            <this.BulkSelectActions/>
          </div>
          <div className={classNames(bulkSelectEnabled && styles.bulkSelectEnabled)}>
            <Table/>
          </div>
        </div>
    );
  }
}
