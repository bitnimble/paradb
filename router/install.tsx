import { createBrowserHistory } from 'history';
import { routeFor, RouteSegments } from 'pages/paradb/router/routes';

export function installRouter() {
  const history = createBrowserHistory();
  const navigate: Navigate = route => {
    const pathname = routeFor(route);
    if (history.location.pathname !== pathname) {
      history.push(pathname);
    }
  };

  return { history, navigate };
}

export type Navigate = (route: RouteSegments) => void;
