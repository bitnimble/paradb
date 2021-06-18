import { createBrowserHistory } from 'history';
import { routeFor, RouteSegments } from 'pages/paradb/router/routes';

export function installRouter() {
  const history = createBrowserHistory();
  const navigate: Navigate = (route, force) => {
    const pathname = routeFor(route);
    if (force) {
      window.location.href = pathname;
    }
    if (history.location.pathname !== pathname) {
      history.push(pathname);
    }
  };

  return { history, navigate };
}

export type Navigate = (route: RouteSegments, force?: boolean) => void;
