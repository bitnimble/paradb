export const enum RoutePath {
  MAP_LIST = '', // home
  MAP = 'map',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SETTINGS = 'settings',
  SIGNUP = 'signup',
  SUBMIT = 'submit',
  INSTRUCTIONS = 'instructions',
};

export type RouteSegments =
  | [RoutePath.MAP, RoutePath.SUBMIT]
  | [RoutePath.MAP, string] // string = map ID
  | [RoutePath.MAP_LIST]
  | [RoutePath.LOGIN]
  | [RoutePath.LOGOUT]
  | [RoutePath.SETTINGS]
  | [RoutePath.SIGNUP]
  | [RoutePath.INSTRUCTIONS]
;

export const routeFor = (segments: RouteSegments) => {
  return '/' + segments.join('/');
};
