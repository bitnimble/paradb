export const enum RoutePath {
  MAP_LIST = '', // home
  MAP = 'map',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  SUBMIT = 'submit',
};

export type RouteSegments =
  | [RoutePath.MAP, RoutePath.SUBMIT]
  | [RoutePath.MAP, string] // string = map ID
  | [RoutePath.MAP_LIST]
  | [RoutePath.LOGIN]
  | [RoutePath.LOGOUT]
  | [RoutePath.SIGNUP]
;

export const routeFor = (segments: RouteSegments) => {
  return '/' + segments.join('/');
};
