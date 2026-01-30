export const enum RoutePath {
  MAP_LIST = '', // home
  MAP = 'map',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD = 'password',
  RESET = 'reset',
  UPDATE = 'update',
  SETTINGS = 'settings',
  SIGNUP = 'signup',
  SUBMIT = 'submit',
  INSTRUCTIONS = 'instructions',
  BLOG = 'blog',
  POST = 'post',
  EMAIL_VERIFICATION = 'email-verification',
}

export type RouteSegments =
  | [RoutePath.MAP, RoutePath.SUBMIT]
  | [RoutePath.MAP, string] // string = map ID
  | [RoutePath.MAP_LIST]
  | [RoutePath.LOGIN]
  | [RoutePath.LOGOUT]
  | [RoutePath.PASSWORD, RoutePath.RESET]
  | [RoutePath.PASSWORD, RoutePath.RESET, RoutePath.UPDATE]
  | [RoutePath.SETTINGS]
  | [RoutePath.SIGNUP]
  | [RoutePath.SIGNUP, RoutePath.EMAIL_VERIFICATION]
  | [RoutePath.INSTRUCTIONS]
  | [RoutePath.BLOG]
  | [RoutePath.BLOG, RoutePath.POST, string]; // string = post ID

export const routeFor = (segments: RouteSegments) => {
  return '/' + segments.join('/');
};
