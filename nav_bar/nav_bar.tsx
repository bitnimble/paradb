import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import React from 'react';
import styles from './nav_bar.css';

export type NavBarProps = {

}

export class NavBar extends React.Component<NavBarProps> {
  render() {
    return (
      <div className={styles.navbar}>
        <RouteLink className={styles.logo} to={routeFor([RoutePath.MAP_LIST])}>
          <T.Medium style="title" color="white">paraDB</T.Medium>
        </RouteLink>
      </div>
    )
  }
}
