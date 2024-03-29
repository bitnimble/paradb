import { createPassword } from 'services/crypto/crypto';
import {
  CamelCase,
  DbError,
  camelCaseKeys,
  fromBytea,
  snakeCaseKeys,
  toBytea,
} from 'services/db/helpers';
import { IdDomain, generateId } from 'services/db/id_gen';
import { getServerContext } from 'services/server_context';
import { PromisedResult, ResultError, wrapError } from 'base/result';
import * as db from 'zapatos/db';
import { users } from 'zapatos/schema';
import zxcvbn from 'zxcvbn';

export type User = Omit<CamelCase<users.JSONSelectable>, 'password'> & { password: string };
export const enum AccountStatus {
  ACTIVE = 'A',
}
export const enum EmailStatus {
  UNVERIFIED = 'U',
  VERIFIED = 'V',
}

type GetUserOpts = GetUserByUsernameOpts | GetUserByIdOpts | GetUserByEmailOpts;
type GetUserByUsernameOpts = { by: 'username'; username: string };
type GetUserByIdOpts = { by: 'id'; id: string };
type GetUserByEmailOpts = { by: 'email'; email: string };
export const enum GetUserError {
  NO_USER = 'no_user',
}
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
    } else {
      user = await db
        .selectOne('users', {
          email: db.sql`lower(${db.self}) = ${db.param(opts.email.toLowerCase())}`,
        })
        .run(pool);
    }
  } catch (e) {
    return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
  }

  if (user != null) {
    return { success: true, value: { ...camelCaseKeys(user), password: fromBytea(user.password) } };
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
): PromisedResult<User, DbError | CreateUserError> {
  const { pool } = await getServerContext();
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
    const existingEmailResult = await getUser({ by: 'email', email: opts.email });
    if (existingEmailResult.success) {
      errorResult.errors.push({ type: CreateUserError.EMAIL_TAKEN });
    }
  } catch (e) {
    errorResult.errors.push(wrapError(e, DbError.UNKNOWN_DB_ERROR));
  }

  if (errorResult.errors.length) {
    return errorResult;
  }

  const id = await generateId(
    IdDomain.USERS,
    async (id) => (await getUser({ by: 'id', id })).success
  );
  if (id == null) {
    return { success: false, errors: [{ type: CreateUserError.TOO_MANY_ID_GEN_ATTEMPTS }] };
  }

  const password = await createPassword(opts.password);
  const passwordBuffer = toBytea(password);

  const now = new Date();
  try {
    const inserted = await db
      .insert(
        'users',
        snakeCaseKeys({
          id,
          creationDate: now,
          accountStatus: AccountStatus.ACTIVE,
          username: opts.username,
          email: opts.email,
          emailStatus: EmailStatus.UNVERIFIED,
          password: passwordBuffer,
          passwordUpdated: now,
        })
      )
      .run(pool);
    return { success: true, value: camelCaseKeys(inserted) };
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
  const { pool } = await getServerContext();
  const errorResult: ResultError<ChangePasswordError> = { success: false, errors: [] };

  // Validate password requirements
  const feedback = isPasswordWeak(opts.newPassword, opts.user.email, opts.user.username);
  if (feedback) {
    return {
      success: false,
      errors: [{ type: ChangePasswordError.INSECURE_PASSWORD, userMessage: feedback }],
    };
  }

  if (errorResult.errors.length) {
    return errorResult;
  }

  const password = await createPassword(opts.newPassword);
  const passwordBuffer = toBytea(password);

  const now = new Date();
  try {
    await db
      .update('users', snakeCaseKeys({ password: passwordBuffer, passwordUpdated: now }), {
        id: opts.user.id,
      })
      .run(pool);

    return { success: true, value: undefined };
  } catch (e) {
    return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
  }
}
