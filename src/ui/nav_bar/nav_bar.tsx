'use client';

import { observer } from 'mobx-react-lite';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { ThemeToggle } from 'ui/base/theme/theme_toggle';
import { useSession } from 'ui/session/session_provider';
import { RoutePath, routeFor } from 'utils/routes';
import styles from './nav_bar.module.css';

export const NavBar = observer(() => {
  const pathname = usePathname();
  const showNavBarActions = ![
    routeFor([RoutePath.PASSWORD, RoutePath.RESET, RoutePath.UPDATE]),
  ].includes(pathname);

  return (
    <div className={styles.navbar}>
      <T.Large style="title" color="white">
        <RouteLink additionalClassName={styles.logo} href={routeFor([RoutePath.MAP_LIST])} force>
          paraDB
        </RouteLink>
      </T.Large>
      <div className={styles.navbarActions}>
        {showNavBarActions ? (
          <>
            <span className={styles.menuItem}>
              <T.Small color="white">
                <RouteLink href={routeFor([RoutePath.BLOG])}>Blog</RouteLink>
              </T.Small>
            </span>
            <span className={styles.menuItem}>
              <T.Small color="white">
                <RouteLink href={routeFor([RoutePath.INSTRUCTIONS])}>
                  Install instructions
                </RouteLink>
              </T.Small>
            </span>
            <Suspense>
              <UserActions />
            </Suspense>
          </>
        ) : null}
        <div className={styles.themeToggleContainer}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
});

function UserActions() {
  const session = useSession();
  return (
    <span className={styles.menuItem}>
      <T.Small color="white">
        {session == null ? (
          <RouteLink href={routeFor([RoutePath.LOGIN])}>Login</RouteLink>
        ) : (
          <>
            <RouteLink href={routeFor([RoutePath.MAP, RoutePath.SUBMIT])}>Submit map</RouteLink>
            {` | Logged in as ${session.username} (${session.email}) | `}
            <RouteLink href={routeFor([RoutePath.SETTINGS])}>Settings</RouteLink>
            {' | '}
            <RouteLink href={routeFor([RoutePath.LOGOUT])} force={true}>
              Logout
            </RouteLink>
          </>
        )}
      </T.Small>
    </span>
  );
}
