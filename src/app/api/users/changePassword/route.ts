import { error } from 'services/helpers';
import { ChangePasswordError, changePassword, getUser } from 'services/users/users_repo';
import { checkBody, getBody } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ChangePasswordResponse,
  deserializeChangePasswordRequest,
  serializeChangePasswordResponse,
} from 'schema/users';
import { getServerContext } from 'services/server_context';

const send = (res: ChangePasswordResponse) =>
  new NextResponse<Buffer>(serializeChangePasswordResponse(res));
export async function POST(req: NextRequest): Promise<NextResponse<Buffer>> {
  const bodyCheckError = checkBody(req, 'missing change password request');
  if (bodyCheckError) {
    return bodyCheckError;
  }

  const { id, oldPassword, newPassword } = await getBody(req, deserializeChangePasswordRequest);

  const userResult = await getUser({ by: 'id', id });
  if (!userResult.success) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: 'Invalid user ID',
    });
  }
  const user = userResult.value;

  const { supabase } = await getServerContext();
  const verifyResponse = await supabase.rpc('confirm_user_password', { password: oldPassword });
  if (verifyResponse.error || verifyResponse.data == false) {
    return send({
      success: false,
      statusCode: 403,
      errorMessage: '',
      oldPassword: 'Incorrect current password.',
    });
  }

  const changePasswordResult = await changePassword({ newPassword, user });
  if (!changePasswordResult.success) {
    const insecurePasswordError = changePasswordResult.errors.find(
      (e) => e.type === ChangePasswordError.INSECURE_PASSWORD
    );
    if (insecurePasswordError) {
      return error({
        statusCode: 400,
        errorSerializer: serializeChangePasswordResponse,
        errorBody: {
          oldPassword: undefined,
          newPassword: insecurePasswordError.userMessage || 'New password is too insecure.',
        },
        message: '',
      });
    } else {
      return error({
        statusCode: 500,
        errorSerializer: serializeChangePasswordResponse,
        errorBody: { oldPassword: undefined, newPassword: undefined },
        message: 'Unknown DB error',
      });
    }
  }

  return send({ success: true });
}
