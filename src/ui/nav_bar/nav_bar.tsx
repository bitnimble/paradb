'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserSession } from 'schema/users';
import { createClient } from 'services/session/supabase_client';
import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { ThemeToggle } from 'ui/base/theme/theme_toggle';
import { RoutePath, routeFor } from 'utils/routes';
import styles from './nav_bar.module.css';

export const NavBar = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then((user) => {
        if (user.error || !user.data.user.email) {
          return undefined;
        }
        const metadata = user.data.user.user_metadata;
        setUser({
          id: metadata.id,
          email: user.data.user.email,
          username: metadata.username,
        });
      });
  }, [setUser]);

  const pathname = usePathname();
  const showUserActions = ![
    routeFor([RoutePath.PASSWORD, RoutePath.RESET, RoutePath.UPDATE]),
  ].includes(pathname);

  return (
    <div className={styles.navbar}>
      <T.Large style="title" color="white">
        <RouteLink additionalClassName={styles.logo} href={routeFor([RoutePath.MAP_LIST])}>
          paraDB&nbsp;&nbsp;
        </RouteLink>
      </T.Large>
      <div className={styles.navbarActions}>
        {showUserActions ? (
          <>
            <span className={styles.menuItem}>
              <T.Small color="white">
                <RouteLink href={routeFor([RoutePath.INSTRUCTIONS])}>
                  Install instructions
                </RouteLink>
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
                  <RouteLink href={routeFor([RoutePath.MAP, RoutePath.SUBMIT])}>
                    Submit map
                  </RouteLink>{' '}
                  | Logged in as {user.username} ({user.email}) |{' '}
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
          </>
        ) : null}
        <div className={styles.themeToggleContainer}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
