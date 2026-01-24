import { checkBody } from 'app/api/helpers';
import { UnreachableError } from 'base/unreachable';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from 'schema/api';
import { SignupError, SignupRequest, SignupResponse } from 'schema/users';
import { DbError } from 'services/db/helpers';
import { CreateUserError, createUser } from 'services/users/users_repo';

const send = (res: SignupResponse) => NextResponse.json(SignupResponse.parse(res));
export async function POST(req: NextRequest): Promise<NextResponse> {
  const bodyCheckError = checkBody(req, 'missing signup request');
  if (bodyCheckError) {
    return bodyCheckError;
  }

  const { username, email, password } = SignupRequest.parse(await req.json());

  const result = await createUser({ username, email, password });
  if (result.success) {
    return send(result.value);
  }

  // Error defaults
  let statusCode = 500;
  let errorMessage = '';
  const signupError: Omit<SignupError, keyof ApiError> = {
    email: undefined,
    password: undefined,
    username: undefined,
  };
  for (const error of result.errors) {
    switch (error.type) {
      case CreateUserError.USERNAME_TAKEN:
        statusCode = 400;
        signupError.username = 'This username has already been taken';
        break;
      case CreateUserError.EMAIL_TAKEN:
        statusCode = 400;
        signupError.email = 'This email has already been registered';
        break;
      case CreateUserError.INSECURE_PASSWORD:
        statusCode = 400;
        signupError.password = error.userMessage || 'Your password is not strong enough';
        break;
      case CreateUserError.TOO_MANY_ID_GEN_ATTEMPTS:
        statusCode = 500;
        errorMessage = 'Could not create user, please try again later';
        break;
      case CreateUserError.SUPABASE_ERROR:
        statusCode = 400;
        errorMessage = error.userMessage || 'Could not create user, please try again later';
        break;
      case DbError.UNKNOWN_DB_ERROR:
        statusCode = 500;
        errorMessage = 'Unknown error, please try again later';
        break;
      default:
        throw new UnreachableError(error.type);
    }
  }
  return send({
    success: false,
    errorMessage,
    statusCode,
    ...signupError,
  });
}
