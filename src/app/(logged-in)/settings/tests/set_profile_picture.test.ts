import {
  SetProfilePictureError,
  setProfilePicture,
} from 'app/api/users/avatar/set_profile_picture';
import { _unwrap } from 'base/result';
import { getServerContext } from 'services/server_context';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const fakePng = (bytes = 32) => Buffer.concat([PNG_SIGNATURE, Buffer.alloc(bytes)]);

const assetsBucket = () => getServerContext().assetsBucket;

describe('setProfilePicture', () => {
  it('stores the PNG in the assets bucket and returns a cache-busted avatar URL', async () => {
    const url = await _unwrap(setProfilePicture('USER0001', fakePng()));
    expect(url).toMatch(/^http:\/\/localhost:3000\/api\/dev\/s3\/avatars\/USER0001\.png\?v=.+/);

    const stored = await _unwrap(assetsBucket().get('avatars/USER0001.png'));
    expect(stored.equals(fakePng())).toBe(true);
  });

  it('uses a different cache token each time so the URL changes on replace', async () => {
    const first = await _unwrap(setProfilePicture('USER0001', fakePng()));
    const second = await _unwrap(setProfilePicture('USER0001', fakePng()));
    expect(first).not.toEqual(second);
  });

  it('rejects non-PNG data', async () => {
    const result = await setProfilePicture('USER0001', Buffer.from('not a png'));
    if (result.success) {
      throw new Error('expected failure');
    }
    expect(result.errors[0].type).toBe(SetProfilePictureError.INVALID_IMAGE);
    expect((await assetsBucket().get('avatars/USER0001.png')).success).toBe(false);
  });

  it('rejects images over the size cap', async () => {
    const result = await setProfilePicture('USER0001', fakePng(3 * 1024 * 1024));
    if (result.success) {
      throw new Error('expected failure');
    }
    expect(result.errors[0].type).toBe(SetProfilePictureError.TOO_LARGE);
  });
});
