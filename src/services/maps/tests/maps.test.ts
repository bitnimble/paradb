import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { _unwrap } from 'base/result';
import * as fs from 'fs/promises';
import { testAuthenticate, testPost, testUser, testUser2 } from 'jest_helpers';
import { deserializeSubmitMapResponse, serializeSubmitMapRequest } from 'paradb-api-schema';
import * as path from 'path';
import { getMap } from 'services/maps/maps_repo';
import { setFavorites } from 'services/users/favorites_repo';
import { getUser } from 'services/users/users_repo';

describe('maps handler', () => {
  const testMapUpload = async (mapPath: string, id?: string, cookieOverride?: string) => {
    const cookie = cookieOverride ?? await testAuthenticate();
    const testMap = await fs.readFile(path.resolve(__dirname, mapPath));
    const response = await testPost(
      '/api/maps/submit',
      serializeSubmitMapRequest,
      deserializeSubmitMapResponse,
      { id, mapData: new Uint8Array(testMap.buffer) },
      cookie,
    );
    return { response, cookie };
  };

  it('allows users to submit maps', async () => {
    const s3Mock = mockClient(S3Client);
    s3Mock.on(PutObjectCommand).resolves({});

    const { response } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  it('allows maps that have a different folder name to the song title, as long as it matches the rlrr files', async () => {
    const s3Mock = mockClient(S3Client);
    s3Mock.on(PutObjectCommand).resolves({});

    const { response } = await testMapUpload('files/Test_valid_different_folder_name.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  it('allows users to re-submit maps to the same map id', async () => {
    const s3Mock = mockClient(S3Client);
    s3Mock.on(PutObjectCommand).resolves({});

    const { response, cookie } = await testMapUpload('files/Test_valid.zip');
    expect(response).toEqual({ success: true, id: expect.stringMatching(/^M[0-9A-F]{6}$/) });
    const id = (response as Extract<typeof response, { success: true }>).id;

    // Favorite the map
    const userIdResp = await _unwrap(getUser({ by: 'email', email: testUser.email }));
    const favoriteResp = await setFavorites(userIdResp.id, [id], true);
    expect(favoriteResp).toEqual({ success: true });
    const map = await _unwrap(getMap(id));
    expect(map.favorites).toEqual(1);

    const { response: resubmitResp } = await testMapUpload('files/Test_valid2.zip', id, cookie);
    expect(resubmitResp).toEqual({ success: true, id });

    const map2 = await _unwrap(getMap(id));
    expect(map2).toEqual(
      expect.objectContaining({
        id,
        title: 'Test 2',
        description: 'New description',
        favorites: 1,
      }),
    );

    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 2);
    expect(s3Mock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
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
      cookie,
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
