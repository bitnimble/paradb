export const enum RoutePath {
  MAP_LIST = '', // home
  MAP = 'map',
  LOGIN = 'login',
};

export type RouteSegments =
  | [RoutePath.MAP, string] // string = map ID
  | [RoutePath.MAP_LIST]
  | [RoutePath.LOGIN]
;

export const routeFor = (segments: RouteSegments) => {
  return '/' + segments.join('/');
};
