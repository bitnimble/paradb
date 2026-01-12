import { PromisedResult, wrapError } from 'base/result';
import { DrumLayout, DrumLayoutFormat, MapValidity, MapVisibility } from 'schema/drum_layouts';
import { DbError, camelCaseKeys } from 'services/db/helpers';
import snakeCaseKeys from 'snakecase-keys';
import { IdDomain, generateId } from 'services/db/id_gen';
import { getDbPool } from 'services/db/pool';
import { getServerContext } from 'services/server_context';
import * as db from 'zapatos/db';
import {
  S3Error,
  deleteDrumLayoutFiles,
  promoteTempDrumLayoutFiles,
  uploadDrumLayoutImage,
} from 'services/maps/s3_handler';

export const enum GetDrumLayoutError {
  MISSING_DRUM_LAYOUT = 'missing_drum_layout',
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}
export const enum UpdateDrumLayoutError {
  UNKNOWN_DB_ERROR = 'unknown_db_error',
}
export const enum DeleteDrumLayoutError {
  MISSING_DRUM_LAYOUT = 'missing_drum_layout',
}
export const enum CreateDrumLayoutError {
  TOO_MANY_ID_GEN_ATTEMPTS = 'too_many_id_gen_attempts',
}
export const enum ValidateDrumLayoutError {
  NO_DATA = 'no_data',
  INVALID_FORMAT = 'invalid_format',
}

type ProcessDrumLayoutOpts = {
  id: string;
  uploader: string;
  layoutFile: Buffer;
};

export class DrumLayoutsRepo {
  async findDrumLayouts(
    findBy: { by: 'id'; ids: string[] } | { by: 'all' }
  ): PromisedResult<DrumLayout[], DbError> {
    const pool = await getDbPool();

    const whereable = findBy.by === 'id' ? { id: db.conditions.isIn(findBy.ids) } : {};

    try {
      const layouts = await db
        .select('drum_layouts', { ...whereable, visibility: MapVisibility.PUBLIC })
        .run(pool);
      return {
        success: true,
        value: layouts.map((l) =>
          DrumLayout.parse({
            ...camelCaseKeys(l),
            layoutFormat: DrumLayoutFormat.parse(l.layout_format),
          })
        ),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async getDrumLayout(id: string): PromisedResult<DrumLayout, GetDrumLayoutError> {
    const { pool } = await getServerContext();
    try {
      const layout = await db
        .selectOne('drum_layouts', { id, visibility: MapVisibility.PUBLIC })
        .run(pool);
      if (layout == null) {
        return { success: false, errors: [{ type: GetDrumLayoutError.MISSING_DRUM_LAYOUT }] };
      }
      return {
        success: true,
        value: DrumLayout.parse({
          ...camelCaseKeys(layout),
          layoutFormat: DrumLayoutFormat.parse(layout.layout_format),
        }),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, GetDrumLayoutError.UNKNOWN_DB_ERROR)] };
    }
  }

  async setValidity(
    id: string,
    validity: MapValidity
  ): PromisedResult<undefined, UpdateDrumLayoutError> {
    const pool = await getDbPool();
    try {
      await db.update('drum_layouts', { validity }, { id }).run(pool);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, UpdateDrumLayoutError.UNKNOWN_DB_ERROR)] };
    }
  }

  async deleteDrumLayout({
    id,
  }: {
    id: string;
  }): PromisedResult<undefined, DbError | DeleteDrumLayoutError | S3Error> {
    const { pool } = await getServerContext();
    try {
      const deleted = await db.deletes('drum_layouts', { id }).run(pool);
      if (deleted.length === 0) {
        return { success: false, errors: [{ type: DeleteDrumLayoutError.MISSING_DRUM_LAYOUT }] };
      }
      await Promise.all([deleteDrumLayoutFiles(id, true), deleteDrumLayoutFiles(id, false)]);
      return { success: true, value: undefined };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async createNewDrumLayout({
    name,
    uploader,
  }: {
    name: string;
    uploader: string;
  }): PromisedResult<{ id: string }, CreateDrumLayoutError | DbError> {
    const pool = await getDbPool();
    const id = await generateId(
      IdDomain.DRUM_LAYOUTS,
      async (id) => !!(await db.selectOne('drum_layouts', { id }).run(pool))
    );
    if (id == null) {
      return { success: false, errors: [{ type: CreateDrumLayoutError.TOO_MANY_ID_GEN_ATTEMPTS }] };
    }

    try {
      await db
        .insert('drum_layouts', [
          snakeCaseKeys({
            id,
            visibility: MapVisibility.HIDDEN,
            validity: MapValidity.PENDING_UPLOAD,
            uploader,
            submissionDate: new Date(),
            name,
            layoutFormat: {},
          }),
        ])
        .run(pool);
      return { success: true, value: { id } };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }

  async validateUploadedDrumLayout(
    opts: ProcessDrumLayoutOpts
  ): PromisedResult<
    DrumLayout,
    S3Error | DbError | CreateDrumLayoutError | ValidateDrumLayoutError
  > {
    const { id, layoutFile: _buffer, uploader } = opts;
    await this.setValidity(id, MapValidity.VALIDATING);

    // TODO: Implement actual parsing and validation of the drum layout file.
    // This should:
    // 1. Unzip the _buffer
    // 2. Parse the layout file format
    // 3. Extract layout metadata (name, description, drumCounts, etc.)
    // 4. Extract any image file for imagePath
    // 5. Return validated data

    // For now, just return placeholder validated data
    const validatedData = {
      name: 'Placeholder Layout',
      description: null as string | null,
      layoutFormat: { drumCounts: {} } as DrumLayoutFormat,
      imageFile: null as { buffer: Buffer; filename: string } | null,
    };

    // Upload image if present
    let imagePath: string | null = null;
    if (validatedData.imageFile) {
      const uploadResult = await uploadDrumLayoutImage(
        id,
        validatedData.imageFile.buffer,
        validatedData.imageFile.filename,
        true
      );
      if (!uploadResult.success) {
        return uploadResult;
      }
      imagePath = uploadResult.value;
    }

    const now = new Date();
    const pool = await getDbPool();
    try {
      const insertedLayout = await db
        .upsert(
          'drum_layouts',
          snakeCaseKeys({
            id,
            visibility: MapVisibility.PUBLIC,
            validity: MapValidity.VALID,
            submissionDate: now,
            name: validatedData.name,
            description: validatedData.description,
            uploader,
            imagePath,
            layoutFormat: validatedData.layoutFormat,
          }),
          ['id']
        )
        .run(pool);

      await promoteTempDrumLayoutFiles(id);

      return {
        success: true,
        value: DrumLayout.parse({
          ...camelCaseKeys(insertedLayout),
          layoutFormat: DrumLayoutFormat.parse(insertedLayout.layout_format),
        }),
      };
    } catch (e) {
      return { success: false, errors: [wrapError(e, DbError.UNKNOWN_DB_ERROR)] };
    }
  }
}

const internalError: [number, string] = [500, 'Could not submit drum layout'];
export const submitDrumLayoutErrorMap: Record<
  S3Error | DbError | CreateDrumLayoutError | ValidateDrumLayoutError,
  [number, string]
> = {
  [S3Error.S3_GET_ERROR]: internalError,
  [S3Error.S3_WRITE_ERROR]: internalError,
  [S3Error.S3_DELETE_ERROR]: internalError,
  [DbError.UNKNOWN_DB_ERROR]: internalError,
  [CreateDrumLayoutError.TOO_MANY_ID_GEN_ATTEMPTS]: internalError,
  [ValidateDrumLayoutError.NO_DATA]: [400, 'Invalid drum layout archive; could not find data'],
  [ValidateDrumLayoutError.INVALID_FORMAT]: [
    400,
    'Invalid drum layout data; could not process the layout file',
  ],
};
