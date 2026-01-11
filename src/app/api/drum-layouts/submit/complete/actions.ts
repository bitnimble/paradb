'use server';

import { MapValidity } from 'schema/drum_layouts';
import { actionError } from 'services/helpers';
import { submitDrumLayoutErrorMap } from 'services/drum_layouts/drum_layouts_repo';
import { deleteDrumLayoutFiles, getDrumLayoutFile } from 'services/maps/s3_handler';
import { getServerContext } from 'services/server_context';
import { getUserSession } from 'services/session/session';

/**
 * Handles the completion and validation of a new drum layout upload. This will publish the layout
 * if it is valid.
 *
 * If it is a reupload, it will replace the existing layout data. If it is a new layout and it is
 * invalid, it will rollback and delete the temporary DrumLayout record.
 */
export async function reportDrumLayoutUploadComplete(id: string) {
  const { drumLayoutsRepo } = await getServerContext();

  const validityResult = await drumLayoutsRepo.setValidity(id, MapValidity.UPLOADED);
  if (!validityResult.success) {
    return actionError({
      errorBody: {},
      message: 'Could not update drum layout upload status.',
      resultError: validityResult,
    });
  }

  const dbLayoutResult = await drumLayoutsRepo.getDrumLayout(id);
  const previousValidity = dbLayoutResult.success ? dbLayoutResult.value.validity : undefined;

  async function cleanupFailedUpload() {
    if (previousValidity === MapValidity.PENDING_UPLOAD) {
      await drumLayoutsRepo.setValidity(id, MapValidity.INVALID);
      await drumLayoutsRepo.deleteDrumLayout({ id });
    } else {
      await deleteDrumLayoutFiles(id, true);
      await drumLayoutsRepo.setValidity(id, MapValidity.VALID);
    }
  }

  const session = await getUserSession();
  if (!session) {
    await cleanupFailedUpload();
    return actionError({
      errorBody: {},
      message: 'You must be logged in to submit drum layouts.',
    });
  }

  if (dbLayoutResult.success && dbLayoutResult.value.uploader !== session.id) {
    await cleanupFailedUpload();
    if (previousValidity === MapValidity.PENDING_UPLOAD) {
      return actionError({
        errorBody: {},
        message: 'You must begin and complete the upload while logged into the same user session.',
      });
    } else {
      return actionError({
        errorBody: {},
        message: 'Only the original uploader can reupload a drum layout.',
      });
    }
  }

  const getFileResult = await getDrumLayoutFile(id, true);
  if (!getFileResult.success) {
    await cleanupFailedUpload();
    return actionError({
      errorBody: {},
      message: 'The file could not be processed.',
      resultError: getFileResult,
    });
  }
  const layoutFile = getFileResult.value;
  if (layoutFile.byteLength > 1024 * 1024 * 100) {
    await cleanupFailedUpload();
    return actionError({
      message: 'File is over the filesize limit (100MB)',
      errorBody: {},
    });
  }
  const processResult = await drumLayoutsRepo.validateUploadedDrumLayout({
    id,
    layoutFile,
    uploader: session.id,
  });
  if (!processResult.success) {
    await cleanupFailedUpload();
    const [_statusCode, message] = submitDrumLayoutErrorMap[processResult.errors[0].type];
    return actionError({
      message: processResult.errors[0].userMessage || message,
      errorBody: {},
      resultError: processResult,
    });
  }

  return { success: true, value: processResult.value } as const;
}
