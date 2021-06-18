import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { PDMap } from 'pages/paradb/map/map_schema';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import React from 'react';
import styles from './map_list.css';

type Props = {
  maps?: PDMap[];
  onMount(): void;
};

export class MapList extends React.Component<Props> {
  componentDidMount() {
    this.props.onMount();
  }

  render() {
    if (!this.props.maps) {
      return <div>Loading</div>;
    }
    return (
      <div className={styles.mapList}>
        {this.props.maps.map(m => (
          <T.Medium key={m.id}>
            <RouteLink to={{
              pathname: routeFor([RoutePath.MAP, m.id]),
              state: m,
            }}>
              <div className={styles.map}>
                {m.title} - {m.artist}
              </div>
            </RouteLink>
          </T.Medium>
        ))}
      </div>
    )
  }
}
