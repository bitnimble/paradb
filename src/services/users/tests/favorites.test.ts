import { apiResponse } from 'schema/api';
import { deserializeGetFavoriteMapsResponse, serializeSetFavoriteMapsRequest } from 'schema/users';
import { testAuthenticate, testGet, testPost } from 'services/jest_helpers';

describe('favorites handler', () => {
  it('can add and retrieve favorites', async () => {
    const cookie = await testAuthenticate();

    const setResp = await testPost(
      '/api/favorites',
      serializeSetFavoriteMapsRequest,
      apiResponse.deserialize,
      { mapIds: ['2'], isFavorite: true },
      cookie
    );

    expect(setResp.success).toBe(true);

    const getResp = await testGet('/api/favorites', deserializeGetFavoriteMapsResponse, cookie);
    expect(getResp.success).toBe(true);

    const maps = (getResp as Extract<typeof getResp, { success: true }>).maps;
    expect(maps.length).toEqual(1);
    expect(maps[0].id).toEqual('2');
    expect(maps[0].title).toEqual('All Star 2');
  });
});
