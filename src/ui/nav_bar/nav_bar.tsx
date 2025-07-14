import { RouteLink } from 'ui/base/text/link';
import { T } from 'ui/base/text/text';
import { ThemeToggle } from 'ui/base/theme/theme_toggle';
import { routeFor, RoutePath } from 'utils/routes';
import styles from './nav_bar.module.css';
import { getUserSession } from 'services/session/session';

export const NavBar = async () => {
  const user = await getUserSession();

  return (
    <div className={styles.navbar}>
      <T.Large style="title" color="white">
        <RouteLink additionalClassName={styles.logo} href={routeFor([RoutePath.MAP_LIST])}>
          paraDB&nbsp;&nbsp;
        </RouteLink>
      </T.Large>
      <div className={styles.navbarActions}>
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
        <div className={styles.themeToggleContainer}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
