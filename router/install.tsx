import { routeFor, RouteSegments } from 'pages/paradb/router/routes';
import { useNavigate } from 'react-router-dom';

export function installRouter() {
  const navigate: Navigate = (route, force) => {
    const pathname = routeFor(route);
    if (force) {
      window.location.href = pathname;
    }
    if (window.location.pathname !== pathname) {
      const navigate = useNavigate();
      navigate(pathname);
    }
  };

  return { history, navigate };
}

export type Navigate = (route: RouteSegments, force?: boolean) => void;
