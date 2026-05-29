import { reportUploadComplete } from 'app/api/maps/submit/complete/actions';
import { _unwrap } from 'base/result';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SubmitMapRequest, SubmitMapResponse } from 'schema/maps';
import { testAuthenticate, testPost, testUser2 } from 'services/jest_helpers';
import { FakeS3Handler } from 'services/maps/s3_handler_fake';
import { getServerContext } from 'services/server_context';
import { _setCurrentUserForTesting } from 'services/session/supabase_fake';
import { createUser } from 'services/users/users_repo';

// Default in-process uploader. `maps.uploader` has no FK, so this id doesn't need a real user row;
// it only has to match the session id we install below (which the completion flow enforces).
const UPLOADER = { id: 'UPLOAD1', email: 'uploader@test.com' };

describe('maps handler', () => {
  // Drives the real upload-completion flow in-process: create the placeholder map (as the submit
  // route would), seed the uploaded zip into the fake S3 store (standing in for the client's PUT to
  // the presigned URL), install the session user, then run the completion server action which
  // validates and publishes (or rolls back).
  const completeUpload = async (
    zipName: string,
    opts: { id?: string; isReupload?: boolean; uploaderId?: string } = {}
  ) => {
    const uploaderId = opts.uploaderId ?? UPLOADER.id;
    const { mapsRepo, s3Handler } = await getServerContext();
    const buffer = await fs.readFile(path.resolve(__dirname, 'files', zipName));
    const id =
      opts.id ??
      (await _unwrap(mapsRepo.createNewMap({ title: 'placeholder', uploader: uploaderId }))).id;
    (s3Handler as FakeS3Handler)._putMapFileForTesting(id, buffer);
    _setCurrentUserForTesting({ id: uploaderId, email: UPLOADER.email });
    const result = await reportUploadComplete(id, opts.isReupload ?? false);
    return { result, id };
  };

  it('publishes a valid map', async () => {
    const { result } = await completeUpload('Test_valid.zip');
    expect(result.success).toBe(true);
  });

  it('allows maps that have a different folder name to the song title, as long as it matches the rlrr files', async () => {
    const { result } = await completeUpload('Test_valid_different_folder_name.zip');
    expect(result.success).toBe(true);
  });

  it('allows users to re-submit maps to the same map id', async () => {
    const { result, id } = await completeUpload('Test_valid.zip');
    expect(result.success).toBe(true);

    const { result: reuploadResult } = await completeUpload('Test_valid2.zip', {
      id,
      isReupload: true,
    });
    expect(reuploadResult.success).toBe(true);
    const map = (reuploadResult as Extract<typeof reuploadResult, { success: true }>).value;
    expect(map).toEqual(
      expect.objectContaining({ id, title: 'Test 2', description: 'New description' })
    );
  });

  it("contributes to the map's favorite count", async () => {
    // Favorites have an FK to users.id, so favorite as a real user.
    const user = await _unwrap(
      createUser({
        email: testUser2.email,
        username: testUser2.username,
        password: testUser2.password,
      })
    );
    const { id } = await completeUpload('Test_valid.zip', { uploaderId: user.id });

    const { favoritesRepo, mapsRepo } = await getServerContext();
    await _unwrap(favoritesRepo.setFavorites(user.id, [id], true));

    const map = await _unwrap(mapsRepo.getMap(id));
    expect(map.favorites).toEqual(1);
  });

  it("does not allow a user to resubmit another user's maps", async () => {
    // Publish a map owned by UPLOADER, then have a different user (real cookie session) attempt to
    // resubmit it via the submit route, which is the authorization gate before an upload URL is
    // issued.
    const { id } = await completeUpload('Test_valid.zip');

    const otherCookie = await testAuthenticate(testUser2);
    const resp = await testPost(
      '/api/maps/submit',
      SubmitMapRequest,
      SubmitMapResponse,
      { title: 'My map', id },
      otherCookie
    );
    expect(resp).toEqual({
      success: false,
      errorMessage: `Not authorized to modify the specified map: ${id}`,
      statusCode: 403,
    });
  });

  describe('fails when', () => {
    const expectUploadError = async (zipName: string, errorMessage: string) => {
      const { result } = await completeUpload(zipName);
      expect(result).toEqual({ success: false, errorMessage });
    };

    it('has mismatched metadata in each rlrr', () =>
      expectUploadError(
        'Test_different_metadata.zip',
        'All difficulties need to have identical metadata (excluding complexity)'
      ));

    it('has an incorrectly named root folder', () =>
      expectUploadError(
        'Test_incorrect_folder_name.zip',
        'The top-level folder name needs to match the names of the rlrr files'
      ));

    it('has no top-level folder', () =>
      expectUploadError(
        'Test_missing_folder.zip',
        'Incorrect folder structure. There needs to be exactly one top-level folder containing all of the files, and the folder needs to match the song title.'
      ));

    it('is missing the album art file', () =>
      expectUploadError('Test_missing_album_art.zip', 'Missing album art'));

    it('is missing a drum audio track', () =>
      expectUploadError(
        'Test_missing_audio_drums.zip',
        'Missing audio track drums.ogg in Test_Easy.rlrr'
      ));

    it('is missing a song audio track', () =>
      expectUploadError(
        'Test_missing_audio_song.zip',
        'Missing audio track song.ogg in Test_Easy.rlrr'
      ));

    it('is corrupted, or an unsupported archive format', () =>
      expectUploadError('Test_invalid_archive.zip', 'Invalid map archive; could not find map data'));

    it('has no rlrr files', () =>
      expectUploadError('Test_missing_rlrr.zip', 'Invalid map archive; could not find map data'));

    it('has a corrupted or incorrectly formatted rlrr file', () =>
      expectUploadError(
        'Test_invalid_rlrr.zip',
        'Invalid map data; could not process the map .rlrr files'
      ));

    it('is missing a required field in the rlrr file', () =>
      expectUploadError(
        'Test_missing_title.zip',
        'Test_Easy.rlrr is missing the "title" metadata property'
      ));
  });
});
