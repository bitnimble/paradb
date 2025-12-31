import { bool, extend, list, optional, rec, Reify, str, union } from './builder';
import { apiError, apiSuccess } from './api';
import { pdMap } from './maps';

/* Structs */
export type User = Reify<typeof serializeUser>;
const user = rec('user', {
  id: str('id'),
  username: str('username'),
  email: str('email'),
});
export const { serialize: serializeUser, deserialize: deserializeUser } = user;

export type GetUserResponse = Reify<typeof serializeGetUserResponse>;
export const getUserSuccess = extend('getUserSuccess', apiSuccess, {
  user,
});
export const { serialize: serializeGetUserResponse, deserialize: deserializeGetUserResponse } =
  union('getUserResponse', 'success', [getUserSuccess, apiError]);

export type UserSession = Reify<typeof serializeUserSession>;
export const { serialize: serializeUserSession, deserialize: deserializeUserSession } = rec(
  'userSession',
  {
    id: str('id'),
    username: str('username'),
    email: str('email'),
  }
);

/* Login */
export type LoginRequest = Reify<typeof serializeLoginRequest>;
export const { serialize: serializeLoginRequest, deserialize: deserializeLoginRequest } = rec(
  'loginRequest',
  {
    username: str('username'),
    password: str('password'),
  }
);
export type LoginError = Reify<typeof loginError>;
const loginError = extend('loginError', apiError, {});
export type LoginSuccess = Reify<typeof loginSuccess>;
const loginSuccess = extend('loginSuccess', apiSuccess, {
  accessToken: str('accessToken'),
  refreshToken: str('refreshToken'),
});
export type LoginResponse = Reify<typeof serializeLoginResponse>;
export const { serialize: serializeLoginResponse, deserialize: deserializeLoginResponse } = union(
  'loginResponse',
  'success',
  [loginSuccess, loginError]
);

/* Signup */
export type SignupRequest = Reify<typeof serializeSignupRequest>;
export const { serialize: serializeSignupRequest, deserialize: deserializeSignupRequest } = rec(
  'signupRequest',
  {
    username: str('username'),
    email: str('email'),
    password: str('password'),
  }
);
export type SignupError = Reify<typeof signupError>;
const signupError = extend('signupError', apiError, {
  username: optional(str('username')),
  email: optional(str('email')),
  password: optional(str('password')),
});
export type SignupSuccess = Reify<typeof signupSuccess>;
const signupSuccess = extend('signupSuccess', apiSuccess, {
  id: str('id'),
  session: optional(
    rec('session', {
      accessToken: str('accessToken'),
      refreshToken: str('refreshToken'),
    })
  ),
});
export type SignupResponse = Reify<typeof serializeSignupResponse>;
export const { serialize: serializeSignupResponse, deserialize: deserializeSignupResponse } = union(
  'signupResponse',
  'success',
  [signupSuccess, signupError]
);

/** Update */
export type ChangePasswordRequest = Reify<typeof serializeChangePasswordRequest>;
export const {
  serialize: serializeChangePasswordRequest,
  deserialize: deserializeChangePasswordRequest,
} = rec('changePasswordRequest', {
  id: str('id'),
  oldPassword: str('oldPassword'),
  newPassword: str('newPassword'),
});

export type ChangePasswordError = Reify<typeof changePasswordError>;
const changePasswordError = extend('changePasswordError', apiError, {
  oldPassword: optional(str('oldPassword')),
  newPassword: optional(str('newPassword')),
});
export type ChangePasswordResponse = Reify<typeof serializeChangePasswordResponse>;
export const {
  serialize: serializeChangePasswordResponse,
  deserialize: deserializeChangePasswordResponse,
} = union('changePasswordResponse', 'success', [apiSuccess, changePasswordError]);

/** User-specific map data. User ID is implicit and pulled from the session cookie for all of these requests. */
export type GetFavoriteMapsSuccess = Reify<typeof getFavoriteMapsSuccess>;
export const getFavoriteMapsSuccess = extend('getFavoriteMapsSuccess', apiSuccess, {
  maps: list('maps', pdMap),
});
export type GetFavoriteMapsResponse = Reify<typeof serializeGetFavoriteMapsResponse>;
export const {
  serialize: serializeGetFavoriteMapsResponse,
  deserialize: deserializeGetFavoriteMapsResponse,
} = union('getFavoriteMapsResponse', 'success', [getFavoriteMapsSuccess, apiError]);

export type SetFavoriteMapsRequest = Reify<typeof serializeSetFavoriteMapsRequest>;
export const {
  serialize: serializeSetFavoriteMapsRequest,
  deserialize: deserializeSetFavoriteMapsRequest,
} = rec('setFavoriteMapsRequest', {
  mapIds: list('mapIds', str('mapId')),
  isFavorite: bool('isFavorite'),
});
