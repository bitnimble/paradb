import { MapValidity } from 'schema/maps';
import { actionError } from 'services/helpers';
import { submitErrorMap } from 'services/maps/maps_repo';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

/**
 * Validates and publishes a map whose archive has already been uploaded to S3 (a fresh upload or a
 * reupload), making it public when valid. A freshly-created map is rolled back on failure; a
 * reupload reverts to its previous valid state.
 *
 * Invoked by the POST /api/maps/submit/complete route. Also called in-process by the integration
 * tests: the in-memory fake S3 only round-trips within a single process, so they seed the archive
 * and run this directly rather than over HTTP.
 */
export async function completeMapUpload(id: string, isReupload: boolean) {
  const { mapsRepo, s3Handler } = await getServerContext();

  const validityResult = await mapsRepo.setValidity(
    id,
    isReupload ? MapValidity.REUPLOADED : MapValidity.UPLOADED
  );
  if (!validityResult.success) {
    return actionError({
      errorBody: {},
      message: 'Could not update map upload status.',
      resultError: validityResult,
      shouldLog: true,
    });
  }

  const dbMapResult = await mapsRepo.getMap(id);
  const previousValidity = dbMapResult.success ? dbMapResult.value.validity : undefined;

  async function cleanupFailedUpload() {
    // If this is a freshly created Map, delete the Map record
    if (previousValidity === MapValidity.PENDING_UPLOAD) {
      // Mark as invalid first in case any other parts of deletion fail
      await mapsRepo.setValidity(id, MapValidity.INVALID);
      await mapsRepo.deleteMap({ id });
    } else {
      // Delete temp files
      await s3Handler.deleteFiles(id, true);
      // This is a reupload, so reset validity back to valid
      await mapsRepo.setValidity(id, MapValidity.VALID);
    }
  }

  const session = await getUserSession();
  if (!session) {
    await cleanupFailedUpload();
    return actionError({
      errorBody: {},
      message: 'You must be logged in to submit maps.',
    });
  }

  // Technically this isn't required, but better safe than sorry - just enforce it for now for
  // consistency
  if (dbMapResult.success && dbMapResult.value.uploader !== session.id) {
    await cleanupFailedUpload();
    if (previousValidity === MapValidity.PENDING_UPLOAD) {
      return actionError({
        errorBody: {},
        message: 'You must begin and complete the upload while logged into the same user session.',
      });
    } else {
      return actionError({
        errorBody: {},
        message: 'Only the original map uploader can reupload a map.',
      });
    }
  }

  // Fetch it and begin processing
  const getMapResult = await s3Handler.getMapFile(id, true);
  if (!getMapResult.success) {
    await cleanupFailedUpload();
    return actionError({
      errorBody: {},
      message: 'The file could not be processed.',
      resultError: getMapResult,
      shouldLog: true,
    });
  }
  const mapFile = getMapResult.value;
  if (mapFile.byteLength > 1024 * 1024 * 100) {
    await cleanupFailedUpload();
    // 100MiB. We use MiB because that's what Windows displays in Explorer and therefore what users will expect.
    return actionError({
      message: 'File is over the filesize limit (100MB)',
      errorBody: {},
    });
  }
  const processMapResult = await mapsRepo.validateUploadedMap({
    id,
    mapFile,
    uploader: session.id,
  });
  if (!processMapResult.success) {
    await cleanupFailedUpload();
    // TODO: report all errors back to the client and not just the first one
    const [_statusCode, message] = submitErrorMap[processMapResult.errors[0].type];
    return actionError({
      message: processMapResult.errors[0].userMessage || message,
      errorBody: {},
      resultError: processMapResult,
      shouldLog: true,
    });
  }

  return { success: true, value: processMapResult.value } as const;
}
