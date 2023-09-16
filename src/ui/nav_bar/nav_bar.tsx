'use client';

import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import React from 'react';
import styles from './nav_bar.module.css';
import { useSession } from 'session/session_provider';
import { observer } from 'mobx-react';
import { routeFor, RoutePath } from 'utils/routes';

export const NavBar = observer(() => {
  const { user } = useSession();

  return (
    <div className={styles.navbar}>
      <T.Large style="title" color="white">
        <RouteLink additionalClassName={styles.logo} href={routeFor([RoutePath.MAP_LIST])}>
          paraDB&nbsp;&nbsp;
        </RouteLink>
      </T.Large>
      <div className={styles.userStatus}>
        <span className={styles.menuItem}>
          <T.Small color="white">
            <RouteLink href={routeFor([RoutePath.INSTRUCTIONS])}>Install instructions</RouteLink>
          </T.Small>
        </span>
        {user == null ? (
          <span className={styles.menuItem}>
            <T.Small color="white">
              <RouteLink href={routeFor([RoutePath.LOGIN])}>Login</RouteLink>
            </T.Small>
          </span>
        ) : (
          <span className={styles.menuItem}>
            <T.Small color="white">
              <RouteLink href={routeFor([RoutePath.MAP, RoutePath.SUBMIT])}>Submit map</RouteLink> |
              Logged in as {user.username} ({user.email}) |{' '}
              <RouteLink href={routeFor([RoutePath.SETTINGS])} force={true}>
                Settings
              </RouteLink>{' '}
              |{' '}
              <RouteLink href={routeFor([RoutePath.LOGOUT])} force={true}>
                Logout
              </RouteLink>
            </T.Small>
          </span>
        )}
      </div>
    </div>
  );
});
