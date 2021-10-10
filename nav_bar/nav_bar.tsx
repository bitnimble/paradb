import { RouteLink } from 'pages/paradb/base/text/link';
import { T } from 'pages/paradb/base/text/text';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { User } from 'paradb-api-schema';
import React from 'react';
import styles from './nav_bar.css';

export type NavBarProps = {
  user: User | undefined,
};

export class NavBar extends React.Component<NavBarProps> {
  render() {
    return (
      <div className={styles.navbar}>
        <T.Large style="title" color="white">
          <RouteLink additionalClassName={styles.logo} to={routeFor([RoutePath.MAP_LIST])}>
            paraDB
          </RouteLink>
        </T.Large>
        <div className={styles.userStatus}>
          {this.props.user == null
            ? (
              <T.Small color="white">
                <RouteLink to={routeFor([RoutePath.LOGIN])}>Login</RouteLink>
              </T.Small>
            )
            : (
              <T.Small color="white">
                <RouteLink to={routeFor([RoutePath.MAP, RoutePath.SUBMIT])}>Submit map</RouteLink> | Logged in as {this.props.user.username} ({this.props.user.email}) | <RouteLink to={routeFor([RoutePath.LOGOUT])} force={true}>Logout</RouteLink>
              </T.Small>
            )
          }
        </div>
      </div>
    )
  }
}
