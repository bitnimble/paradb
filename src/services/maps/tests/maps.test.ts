import * as fs from 'fs/promises';
import * as path from 'path';
import { deserializeApiSuccess } from 'schema/api';
import {
  deserializeGetMapResponse,
  deserializeSubmitMapResponse,
  serializeSubmitMapRequest,
} from 'schema/maps';
import { serializeSetFavoriteMapsRequest } from 'schema/users';
import { testAuthenticate, testGet, testPost, testUser2 } from 'services/jest_helpers';

describe('maps handler', () => {
  const testMapUpload = async (mapPath: string, id?: string, cookieOverride?: string) => {
    const cookie = cookieOverride ?? (await testAuthenticate());
    const testMap = await fs.readFile(path.resolve(__dirname, mapPath));
    const response = await testPost(
      '/api/maps/submit',
      serializeSubmitMapRequest,
      deserializeSubmitMapResponse,
      { id, mapData: new Uint8Array(testMap.buffer) },
      cookie
    );
    return { response, cookie };
  };

  const getMap = (id: string) => {
    return testGet(`/api/maps/${id}`, deserializeGetMapResponse);
  };

  it('allows users to submit maps', async () => {
    const { response } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
  });

  it('allows maps that have a different folder name to the song title, as long as it matches the rlrr files', async () => {
    const { response } = await testMapUpload('files/Test_valid_different_folder_name.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
  });

  it('allows users to re-submit maps to the same map id', async () => {
    const { response, cookie } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
    const id = (response as Extract<typeof response, { success: true }>).id;

    const { response: resubmitResp } = await testMapUpload('files/Test_valid2.zip', id, cookie);
    expect(resubmitResp).toEqual({ success: true, id });

    const map2 = await getMap(id);
    expect(map2).toEqual({
      success: true,
      map: expect.objectContaining({
        id,
        title: 'Test 2',
        description: 'New description',
      }),
    });
  });

  it("allows users to favorite maps and contribute to the map's favorite count", async () => {
    const { response, cookie } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
    const id = (response as Extract<typeof response, { success: true }>).id;

    // Favorite the map
    const favoriteResp = await testPost(
      '/api/favorites',
      serializeSetFavoriteMapsRequest,
      deserializeApiSuccess,
      {
        mapIds: [id],
        isFavorite: true,
      },
      cookie
    );
    expect(favoriteResp.success).toEqual(true);
    const mapResp = await getMap(id);
    expect(mapResp).toEqual({
      success: true,
      map: expect.objectContaining({
        favorites: 1,
      }),
    });
  });

  it("does not allow a user to resubmit another user's maps", async () => {
    const { response } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
    const id = (response as Extract<typeof response, { success: true }>).id;

    const cookie = await testAuthenticate(testUser2);
    const newMap = await fs.readFile(path.resolve(__dirname, 'files/Test_valid2.zip'));
    const resp = await testPost(
      '/api/maps/submit',
      serializeSubmitMapRequest,
      deserializeSubmitMapResponse,
      { id, mapData: new Uint8Array(newMap.buffer) },
      cookie
    );
    expect(resp).toEqual({
      success: false,
      errorMessage: `Not authorized to modify the specified map: ${id}`,
      statusCode: 403,
    });
  });

  describe('fails when', () => {
    it('has mismatched metadata in each rlrr', async () => {
      const { response } = await testMapUpload('files/Test_different_metadata.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'All difficulties need to have identical metadata (excluding complexity)',
      });
    });

    it('has an incorrectly named root folder', async () => {
      const { response } = await testMapUpload('files/Test_incorrect_folder_name.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'The top-level folder name needs to match the names of the rlrr files',
      });
    });

    it('has no top-level folder', async () => {
      const { response } = await testMapUpload('files/Test_missing_folder.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage:
          'Incorrect folder structure. There needs to be exactly one top-level folder containing all of the files, and the folder needs to match the song title.',
      });
    });

    it('is missing the album art file', async () => {
      const { response } = await testMapUpload('files/Test_missing_album_art.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'Missing album art',
      });
    });

    it('is corrupted, or an unsupported archive format', async () => {
      const { response } = await testMapUpload('files/Test_invalid_archive.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'Invalid map archive; could not find map data',
      });
    });

    it('has no rlrr files', async () => {
      const { response } = await testMapUpload('files/Test_missing_rlrr.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'Invalid map archive; could not find map data',
      });
    });

    it('has a corrupted or incorrectly formatted rlrr file', async () => {
      const { response } = await testMapUpload('files/Test_invalid_rlrr.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage: 'Invalid map data; could not process the map .rlrr files',
      });
    });

    it('is missing a required field in the rlrr file', async () => {
      const { response } = await testMapUpload('files/Test_missing_title.zip');
      expect(response).toEqual({
        success: false,
        statusCode: 400,
        errorMessage:
          'Invalid map data; a map .rlrr is missing a required field (title, artist or complexity)',
      });
    });
  });
});
