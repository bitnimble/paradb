import { observer } from 'mobx-react';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import React from 'react';
import styles from './map_list.css';

type Props = {
  Table: React.ComponentType,
  filterQuery: string,
  onMount(): void,
  onChangeFilterQuery(val: string): void,
};

@observer
export class MapList extends React.Component<Props> {
  componentDidMount() {
    this.props.onMount();
  }

  render() {
    const { Table, filterQuery, onChangeFilterQuery } = this.props;
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
          </div>
          <Table/>
        </div>
    );
  }
}
