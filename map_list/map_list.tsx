import { observer } from 'mobx-react';
import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { Textbox } from 'pages/paradb/base/ui/textbox/textbox';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { PDMap, serializeMap } from 'paradb-api-schema';
import React from 'react';
import styles from './map_list.css';

type Props = {
  maps?: PDMap[],
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
    const { maps, filterQuery, onChangeFilterQuery } = this.props;
    if (!maps) {
      return <div>Loading</div>;
    }
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
          {maps.map(m => (
              <T.Medium key={m.id}>
                <RouteLink
                    to={{
                      pathname: routeFor([RoutePath.MAP, m.id]),
                      state: serializeMap(m),
                    }}
                >
                  <div className={styles.map}>
                    {m.title} - {m.artist}
                  </div>
                </RouteLink>
              </T.Medium>
          ))}
        </div>
    );
  }
}
