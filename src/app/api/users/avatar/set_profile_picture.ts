import { PromisedResult, wrapError } from 'base/result';
import { randomBytes } from 'crypto';
import { S3Error } from 'services/s3/s3_bucket';
import { getServerContext } from 'services/server_context';
import { avatarKey, buildAvatarUrl } from 'services/users/avatar';

export const enum SetProfilePictureError {
  INVALID_IMAGE = 'invalid_image',
  TOO_LARGE = 'too_large',
  UPDATE_FAILED = 'update_failed',
}

// Avatars are small (a 512x512 PNG is tens of KB); cap well above that to reject anything unexpected.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}

export async function setProfilePicture(
  userId: string,
  png: Buffer
): PromisedResult<string, SetProfilePictureError | S3Error> {
  if (png.length > MAX_AVATAR_BYTES) {
    return { success: false, errors: [{ type: SetProfilePictureError.TOO_LARGE }] };
  }
  if (!isPng(png)) {
    return { success: false, errors: [{ type: SetProfilePictureError.INVALID_IMAGE }] };
  }

  const { assetsBucket, supabase } = await getServerContext();
  const putResult = await assetsBucket.put(avatarKey(userId), png, 'image/png');
  if (!putResult.success) {
    return putResult;
  }

  const cacheToken = randomBytes(8).toString('base64url');
  const { error } = await supabase.auth.updateUser({ data: { avatarCacheToken: cacheToken } });
  if (error) {
    return { success: false, errors: [wrapError(error, SetProfilePictureError.UPDATE_FAILED)] };
  }

  return { success: true, value: buildAvatarUrl(userId, cacheToken) };
}
