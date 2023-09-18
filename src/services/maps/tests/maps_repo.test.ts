import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { _unwrap } from 'base/result';
import { getEnvVars } from 'env';
import { deleteMap, getMap, GetMapError } from 'services/maps/maps_repo';
import { setFavorites } from 'services/users/favorites_repo';
import { createUser } from 'services/users/users_repo';

describe('maps repo', () => {
  it('can find maps', async () => {
    const result = await getMap('2');
    expect(result.success).toBe(true);

    const map = (result as Extract<typeof result, { success: true }>).value;
    expect(map.id).toEqual('2');
    expect(map.title).toEqual('All Star 2');
    expect(map.artist).toEqual('Smash Mouth 2');
  });

  it('can delete a map', async () => {
    const s3Mock = mockClient(S3Client);
    s3Mock.on(DeleteObjectCommand).resolves({});
    const env = getEnvVars();

    const deleteResult = await deleteMap({ mapsDir: env.mapsDir, id: '2' });
    expect(deleteResult.success).toBe(true);

    const getResult = await getMap('2');
    expect(getResult.success).toBe(false);
    expect((getResult as Extract<typeof getResult, { success: false }>).errors).toEqual([{
      type: GetMapError.MISSING_MAP,
    }]);

    expect(s3Mock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
    expect(s3Mock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: 's3bucket',
      Key: 'maps/2.zip',
    });
  });

  it('can delete a map that has favorites', async () => {
    const env = getEnvVars();
    const userResult = await _unwrap(
      createUser({
        email: 'test_email@test.com',
        username: 'test_user',
        password: 'NotAWeakPassword917',
      }),
    );
    const favoriteResult = await setFavorites(userResult.id, ['2'], true);
    expect(favoriteResult.success).toBe(true);
    const deleteResult = await deleteMap({ mapsDir: env.mapsDir, id: '2' });
    expect(deleteResult.success).toBe(true);

    const getResult = await getMap('2');
    expect(getResult.success).toBe(false);
    expect((getResult as Extract<typeof getResult, { success: false }>).errors).toEqual([{
      type: GetMapError.MISSING_MAP,
    }]);
  });
});
