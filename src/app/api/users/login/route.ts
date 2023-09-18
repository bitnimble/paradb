import { validatePassword } from 'services/crypto/crypto';
import { setUserSession } from 'services/session/session';
import { getUser } from 'services/users/users_repo';
import { checkBody, getBody } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { LoginResponse, deserializeLoginRequest, serializeLoginResponse } from 'schema/users';

const send = (res: LoginResponse) => new NextResponse<Buffer>(serializeLoginResponse(res));
export async function POST(req: NextRequest): Promise<NextResponse<Buffer>> {
  const bodyCheckError = checkBody(req, 'missing login request');
  if (bodyCheckError) {
    return bodyCheckError;
  }

  const { username, password } = await getBody(req, deserializeLoginRequest);
  const result = await getUser({ by: 'username', username });

  if (result.success) {
    const user = result.value;
    const isValid = await validatePassword(password, user.password);
    if (isValid) {
      // Persist session
      await setUserSession(user);
      return send({ success: true });
    }
  }
  return send({ success: false, statusCode: 401, errorMessage: 'Invalid credentials' });
}
