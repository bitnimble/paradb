import { _unwrap } from 'base/result';
import { getEnvVars } from 'services/env';
import { GetMapError } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';
import { createUser } from 'services/users/users_repo';

describe('maps repo', () => {
  it('can get maps', async () => {
    const { mapsRepo } = await getServerContext();
    const result = await mapsRepo.getMap('2');
    expect(result.success).toBe(true);

    const map = (result as Extract<typeof result, { success: true }>).value;
    expect(map.id).toEqual('2');
    expect(map.title).toEqual('All Star 2');
    expect(map.artist).toEqual('Smash Mouth 2');
  });

  it('cannot get hidden maps', async () => {
    const { mapsRepo } = await getServerContext();
    const result = await mapsRepo.getMap('3');
    expect(result.success).toBe(false);
  });

  it('cannot find hidden maps', async () => {
    const { mapsRepo } = await getServerContext();
    const result = await mapsRepo.findMaps();
    expect(result.success).toBe(true);
    const ids = (result as Extract<typeof result, { success: true }>).value.map((m) => m.id);
    expect(ids.includes('3')).toBe(false);
  });

  it('cannot search for hidden maps', async () => {
    const { mapsRepo } = await getServerContext();
    const result = await mapsRepo.searchMaps({
      query: 'All Star',
      offset: 0,
      limit: 5,
    });
    expect(result.success).toBe(true);
    const ids = (result as Extract<typeof result, { success: true }>).value.map((m) => m.id);
    expect(ids.includes('3')).toBe(false);
  });

  it('can delete a map', async () => {
    const env = getEnvVars();
    const { mapsRepo } = await getServerContext();

    const deleteResult = await mapsRepo.deleteMap({ mapsDir: env.mapsDir, id: '2' });
    expect(deleteResult.success).toBe(true);

    const getResult = await mapsRepo.getMap('2');
    expect(getResult.success).toBe(false);
    expect((getResult as Extract<typeof getResult, { success: false }>).errors).toEqual([
      {
        type: GetMapError.MISSING_MAP,
      },
    ]);

    // TODO: test that it is gone from S3 as well
  });

  it('can delete a map that has favorites', async () => {
    const env = getEnvVars();
    const { mapsRepo, favoritesRepo } = await getServerContext();

    const userResult = await _unwrap(
      createUser({
        email: 'test_email@test.com',
        username: 'test_user',
        password: 'NotAWeakPassword917',
      })
    );
    const favoriteResult = await favoritesRepo.setFavorites(userResult.id, ['2'], true);
    expect(favoriteResult.success).toBe(true);
    const deleteResult = await mapsRepo.deleteMap({ mapsDir: env.mapsDir, id: '2' });
    expect(deleteResult.success).toBe(true);

    const getResult = await mapsRepo.getMap('2');
    expect(getResult.success).toBe(false);
    expect((getResult as Extract<typeof getResult, { success: false }>).errors).toEqual([
      {
        type: GetMapError.MISSING_MAP,
      },
    ]);
  });
});
