import { checkExists } from 'base/preconditions';
import { PromisedResult, ResultError, wrapError } from 'base/result';
import { SignupSuccess } from 'schema/users';
import { CamelCase, DbError, camelCaseKeys, snakeCaseKeys } from 'services/db/helpers';
import { IdDomain, generateId } from 'services/db/id_gen';
import { getServerContext } from 'services/server_context';
import * as db from 'zapatos/db';
import { users } from 'zapatos/schema';
import zxcvbn from 'zxcvbn';

export type User = CamelCase<users.JSONSelectable>;
export const enum AccountStatus {
  ACTIVE = 'A',
}
export const enum EmailStatus {
  UNVERIFIED = 'U',
  VERIFIED = 'V',
}

type GetUserOpts = GetUserByUsernameOpts | GetUserByIdOpts;
type GetUserByUsernameOpts = { by: 'username'; username: string };
type GetUserByIdOpts = { by: 'id'; id: string };
export const enum GetUserError {
  NO_USER = 'no_user',
}
// TODO: rename all of my tables from 'user' to 'profile' to clearly distinguish between public
// profiles and Supabase auth user table
export async function getUser(opts: GetUserOpts): PromisedResult<User, DbError | GetUserError> {
  const { pool } = await getServerContext();
  let user: users.JSONSelectable | undefined;
  try {
    if (opts.by === 'username') {
      user = await db
        .selectOne('users', {
          username: db.sql`lower(${db.self}) = ${db.param(opts.username.toLowerCase())}`,
        })
        .run(pool);
    } else if (opts.by === 'id') {
      user = await db.selectOne('users', { id: opts.id }).run(pool);
    }
  } catch (e) {
    return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
  }

  if (user != null) {
    // TODO: fix NullToUndefined type
    return { success: true, value: { ...camelCaseKeys(user), supabaseId: user.supabase_id } };
  }
  return { success: false, errors: [{ type: GetUserError.NO_USER }] };
}

function isPasswordWeak(password: string, email: string, username: string) {
  if (password.length < 8) {
    return 'Your password is too short';
  }
  // Validate password requirements
  const passwordStrengthResult = zxcvbn(password, [email, username]);
  if (passwordStrengthResult.feedback.warning || passwordStrengthResult.score < 2) {
    return passwordStrengthResult.feedback.warning;
  }
}

type CreateUserOpts = { username: string; email: string; password: string };
export const enum CreateUserError {
  TOO_MANY_ID_GEN_ATTEMPTS = 'too_many_id_gen_attempts',
  INSECURE_PASSWORD = 'insecure_password',
  USERNAME_TAKEN = 'username_taken',
  EMAIL_TAKEN = 'email_taken',
}
export async function createUser(
  opts: CreateUserOpts
): PromisedResult<SignupSuccess, DbError | CreateUserError> {
  const { pool, supabase } = await getServerContext();
  const errorResult: ResultError<DbError | CreateUserError> = { success: false, errors: [] };
  // Validate password requirements
  const feedback = isPasswordWeak(opts.password, opts.email, opts.username);
  // Note that we don't early exit here with the weak password error, as we want to show all possible
  // errors to the user at once (e.g. errors with their username or email as well).
  if (feedback) {
    errorResult.errors.push({ type: CreateUserError.INSECURE_PASSWORD, userMessage: feedback });
  }

  // Test username and email existence
  try {
    const existingUsernameResult = await getUser({ by: 'username', username: opts.username });
    if (existingUsernameResult.success) {
      errorResult.errors.push({ type: CreateUserError.USERNAME_TAKEN });
    }
    const existingEmailResult = await supabase.rpc('check_email_exists', {
      input_email: opts.email,
    });
    if (existingEmailResult.error || existingEmailResult.data === true) {
      errorResult.errors.push({ type: CreateUserError.EMAIL_TAKEN });
    }
  } catch (e) {
    errorResult.errors.push(wrapError(e, DbError.UNKNOWN_DB_ERROR));
  }

  if (errorResult.errors.length) {
    return errorResult;
  }

  // Looks all good - proceed to create new user in Supabase and profile in our DB
  const id = await generateId(
    IdDomain.USERS,
    async (id) => (await getUser({ by: 'id', id })).success
  );
  if (id == null) {
    return { success: false, errors: [{ type: CreateUserError.TOO_MANY_ID_GEN_ATTEMPTS }] };
  }

  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: {
        id,
        username: opts.username,
      },
    },
  });
  if (error) {
    return { success: false, errors: [wrapError(error, DbError.UNKNOWN_DB_ERROR)] };
  }

  try {
    await db
      .insert(
        'users',
        snakeCaseKeys({
          id,
          username: opts.username,
          // TODO: force email confirmation on all users with EmailStatus.UNVERIFIED
          emailStatus: EmailStatus.UNVERIFIED,
          supabaseId: checkExists(data.user || data.session?.user).id,
        })
      )
      .run(pool);
    return {
      success: true,
      value: {
        success: true,
        id,
        session: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            }
          : undefined,
      },
    };
  } catch (e) {
    return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
  }
}

type ChangePasswordOpts = { user: User; newPassword: string };
export const enum ChangePasswordError {
  INSECURE_PASSWORD = 'insecure_password',
}
export async function changePassword(
  opts: ChangePasswordOpts
): PromisedResult<undefined, DbError | ChangePasswordError> {
  const { supabase } = await getServerContext();
  const errorResult: ResultError<ChangePasswordError> = { success: false, errors: [] };

  const email = checkExists((await supabase.auth.getUser()).data.user?.email);
  // Validate password requirements
  const feedback = isPasswordWeak(opts.newPassword, email, opts.user.username);
  if (feedback) {
    return {
      success: false,
      errors: [{ type: ChangePasswordError.INSECURE_PASSWORD, userMessage: feedback }],
    };
  }

  if (errorResult.errors.length) {
    return errorResult;
  }

  const { error } = await supabase.auth.updateUser({ password: opts.newPassword });
  if (error) {
    return { success: false, errors: [wrapError(error, DbError.UNKNOWN_DB_ERROR)] };
  }
  return { success: true, value: undefined };
}
