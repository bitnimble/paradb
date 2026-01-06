import { checkBody } from 'app/api/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { ChangePasswordRequest, ChangePasswordResponse } from 'schema/users';
import { error } from 'services/helpers';
import { getServerContext } from 'services/server_context';
import { ChangePasswordError, changePassword, getUser } from 'services/users/users_repo';

const send = (res: ChangePasswordResponse) => NextResponse.json(ChangePasswordResponse.parse(res));
export async function POST(req: NextRequest): Promise<NextResponse> {
  const bodyCheckError = checkBody(req, 'missing change password request');
  if (bodyCheckError) {
    return bodyCheckError;
  }

  const { id, oldPassword, newPassword } = ChangePasswordRequest.parse(await req.json());

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
        errorBody: {
          oldPassword: undefined,
          newPassword: insecurePasswordError.userMessage || 'New password is too insecure.',
        },
        message: '',
        errorSerializer: ChangePasswordResponse.parse,
      });
    } else {
      return error({
        statusCode: 500,
        errorBody: { oldPassword: undefined, newPassword: undefined },
        message: 'Unknown DB error',
        errorSerializer: ChangePasswordResponse.parse,
      });
    }
  }

  return send({ success: true });
}
