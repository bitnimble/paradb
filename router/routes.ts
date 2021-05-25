export const enum RoutePath {
  MAP_LIST = '', // home
  MAP = 'map',
};

export type RouteSegments =
  | [RoutePath.MAP, string] // string = map ID
  | [RoutePath.MAP_LIST]
;

export const routeFor = (segments: RouteSegments) => {
  return '/' + segments.join('/');
};
