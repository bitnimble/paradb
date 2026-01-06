import { z } from 'zod';
import { ApiError, ApiSuccess } from './api';
import { PDMap } from './maps';

/* Structs */
export const User = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
});
export type User = z.infer<typeof User>;

export const GetUserSuccess = ApiSuccess.extend({
  user: User,
});
export type GetUserSuccess = z.infer<typeof GetUserSuccess>;

export const GetUserResponse = z.discriminatedUnion('success', [GetUserSuccess, ApiError]);
export type GetUserResponse = z.infer<typeof GetUserResponse>;

export const UserSession = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
});
export type UserSession = z.infer<typeof UserSession>;

/* Login */
export const LoginRequest = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const LoginError = ApiError.extend({});
export type LoginError = z.infer<typeof LoginError>;

export const LoginSuccess = ApiSuccess.extend({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type LoginSuccess = z.infer<typeof LoginSuccess>;

export const LoginResponse = z.discriminatedUnion('success', [LoginSuccess, LoginError]);
export type LoginResponse = z.infer<typeof LoginResponse>;

/* Signup */
export const SignupRequest = z.object({
  username: z.string(),
  email: z.string(),
  password: z.string(),
});
export type SignupRequest = z.infer<typeof SignupRequest>;

export const SignupError = ApiError.extend({
  username: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
});
export type SignupError = z.infer<typeof SignupError>;

export const SignupSuccess = ApiSuccess.extend({
  id: z.string(),
  session: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string(),
    })
    .optional(),
});
export type SignupSuccess = z.infer<typeof SignupSuccess>;

export const SignupResponse = z.discriminatedUnion('success', [SignupSuccess, SignupError]);
export type SignupResponse = z.infer<typeof SignupResponse>;

/** Update */
export const ChangePasswordRequest = z.object({
  id: z.string(),
  oldPassword: z.string(),
  newPassword: z.string(),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequest>;

export const ChangePasswordError = ApiError.extend({
  oldPassword: z.string().optional(),
  newPassword: z.string().optional(),
});
export type ChangePasswordError = z.infer<typeof ChangePasswordError>;

export const ChangePasswordResponse = z.discriminatedUnion('success', [
  ApiSuccess,
  ChangePasswordError,
]);
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponse>;

/** User-specific map data. User ID is implicit and pulled from the session cookie for all of these requests. */
export const GetFavoriteMapsSuccess = ApiSuccess.extend({
  maps: z.array(PDMap),
});
export type GetFavoriteMapsSuccess = z.infer<typeof GetFavoriteMapsSuccess>;

export const GetFavoriteMapsResponse = z.discriminatedUnion('success', [
  GetFavoriteMapsSuccess,
  ApiError,
]);
export type GetFavoriteMapsResponse = z.infer<typeof GetFavoriteMapsResponse>;

export const SetFavoriteMapsRequest = z.object({
  mapIds: z.array(z.string()),
  isFavorite: z.boolean(),
});
export type SetFavoriteMapsRequest = z.infer<typeof SetFavoriteMapsRequest>;
