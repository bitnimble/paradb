import classNames from 'classnames';
import { observer } from 'mobx-react';
import { Button } from 'pages/paradb/base/ui/button/button';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { Complexity } from 'paradb-api-schema';
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

function getComplexityColor(complexity: number) {
  switch (complexity) {
    case 1:
      return 'green';
    case 2:
      return 'yellow';
    case 3:
      return 'orange';
    case 4:
      return 'red';
    case 5:
      return 'black';
    default:
      throw new Error(`Did not expect complexity level ${complexity}`);
  }
}

export const ComplexityColorPills = (props: { complexities: Complexity[] }) => (
  <div className={styles.complexities}>
    {props
      .complexities
      .map((c, i) => (
        <div
          key={i}
          className={styles.complexityColorPill}
          style={{ backgroundColor: getComplexityColor(c.complexity) }}
        >
        </div>
      ))}
  </div>
);

@observer
export class MapList extends React.Component<Props> {
  componentDidMount() {
    this.props.onMount();
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
