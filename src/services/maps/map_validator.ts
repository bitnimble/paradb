import { FileEntry, ZipReader } from '@zip.js/zip.js';
import { PromisedResult, Result, ResultError, wrapError } from 'base/result';
import { PDMap } from 'schema/maps';
import { longestSongLength, maxMapFileSize, overBudgetMessage } from 'services/maps/map_size';
import { parseRlrr, rlrrSongLength } from 'services/maps/rlrr';
import { MapArchive } from 'services/maps/s3_handler_types';
import { readEntry, zipBasename, zipDirname } from 'services/maps/zip';

type RawMap = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'authoringTool' | 'description' | 'complexity' | 'difficulties'
>;

export const enum ValidateMapError {
  MISMATCHED_DIFFICULTY_METADATA = 'mismatched_difficulty_metadata',
  INCORRECT_FOLDER_STRUCTURE = 'incorrect_folder_structure',
  INCORRECT_FOLDER_NAME = 'incorrect_folder_name',
  NO_DATA = 'no_data',
  MISSING_ALBUM_ART = 'missing_album_art',
  DESCRIPTION_TOO_LONG = 'description_too_long',
  FILE_TOO_LARGE = 'file_too_large',
}
export const enum ValidateMapDifficultyError {
  INVALID_FORMAT = 'invalid_format',
  MISSING_VALUES = 'missing_values',
  NO_AUDIO = 'no_audio',
}

export async function validateMap(opts: {
  id: string;
  archive: MapArchive;
}): PromisedResult<
  RawMap & { albumArtFiles: FileEntry[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  // Reading an entry decompresses and CRC-checks it, and on a remote archive fetches more of it, so
  // anything in here can throw. A throw escaping to the caller would strand the map mid-validation:
  // its upload only gets rolled back on an error Result.
  try {
    const entries = await new ZipReader(opts.archive.reader).getEntries();
    const files = entries.filter((e): e is FileEntry => !e.directory);
    if (files.length === 0) {
      return { success: false, errors: [{ type: ValidateMapError.NO_DATA }] };
    }
    // A submitted map must have exactly one directory in it, and all of the files must be directly
    // under that directory.
    let mapName = files[0].filename.match(/(.+?)\//)?.[1];
    if (mapName?.startsWith('/')) {
      mapName = mapName.substring(1);
    }
    if (mapName == null || !files.every((f) => zipDirname(f.filename) === mapName)) {
      return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_STRUCTURE }] };
    }
    return await validateMapFiles({
      expectedMapName: mapName,
      mapFiles: files,
      archiveSize: opts.archive.size,
    });
  } catch (e) {
    // Corrupted, not a zip at all, or unreadable from storage.
    return { success: false, errors: [wrapError(e, ValidateMapError.NO_DATA)] };
  }
}

function allExists<T>(a: (T | undefined)[]): a is T[] {
  return a.every((t) => t != null);
}
type RawMapMetadata = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'authoringTool' | 'albumArt' | 'description' | 'complexity'
>;
async function validateMapFiles(opts: {
  expectedMapName: string;
  mapFiles: FileEntry[];
  archiveSize: number;
}): PromisedResult<
  RawMap & { albumArtFiles: FileEntry[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  // The map directory needs to have the same name as the rlrr files.
  // TODO: remove this check once Paradiddle supports arbitrary folder names
  const difficultyFiles = opts.mapFiles.filter((f) => f.filename.endsWith('.rlrr'));
  if (!difficultyFiles.every((f) => zipBasename(f.filename).startsWith(opts.expectedMapName))) {
    return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_NAME }] };
  }
  // Gets a file in the map archive, relative to the primary map directory
  const getMapFile = (filename: string) =>
    opts.mapFiles.find((f) => f.filename === `${opts.expectedMapName}/${filename}`);

  const difficultyResults = await Promise.all(
    difficultyFiles.map((f) =>
      readEntry(f).then((b) => validateMapDifficulty(zipBasename(f.filename), b, getMapFile))
    )
  );
  if (difficultyResults.length === 0) {
    return { success: false, errors: [{ type: ValidateMapError.NO_DATA }] };
  }
  const firstError = difficultyResults.find((m) => m.success === false);
  if (firstError && firstError.success === false) {
    return { success: false, errors: firstError.errors };
  }

  const validDifficultyResults = difficultyResults as Exclude<
    (typeof difficultyResults)[number],
    ResultError<ValidateMapDifficultyError>
  >[];

  // Check that all maps have the same metadata.
  for (let i = 1; i < validDifficultyResults.length; i++) {
    const map = validDifficultyResults[i].value;
    for (const [key, value] of Object.entries(map)) {
      // Difficulty name is expected to change between difficulties.
      // Complexity is not, but some existing maps have mismatched complexities between rlrr files,
      // and so this check has been skipped temporarily.
      // TODO: fix all maps with mismatched complexities
      // Song length can differ slightly between separately-recorded difficulties.
      if (key === 'difficultyName' || key === 'complexity' || key === 'length') {
        continue;
      }
      const expected = validDifficultyResults[0].value[key as keyof RawMapMetadata];
      if (value !== expected) {
        return {
          success: false,
          errors: [
            {
              type: ValidateMapError.MISMATCHED_DIFFICULTY_METADATA,
              internalMessage: `mismatched '${key}': '${value}' vs '${expected}'`,
            },
          ],
        };
      }
    }
  }

  if (
    validDifficultyResults.some((d) => d.value.description && d.value.description.length > 50000)
  ) {
    return { success: false, errors: [{ type: ValidateMapError.DESCRIPTION_TOO_LONG }] };
  }

  const sizeLimit = maxMapFileSize(
    longestSongLength(validDifficultyResults.map((d) => d.value.length))
  );
  if (opts.archiveSize > sizeLimit) {
    return {
      success: false,
      errors: [
        {
          type: ValidateMapError.FILE_TOO_LARGE,
          userMessage: overBudgetMessage(opts.archiveSize, sizeLimit),
        },
      ],
    };
  }

  const albumArtFiles = validDifficultyResults
    .map((v) => v.value.albumArt)
    .filter((s): s is string => s != null)
    .map(getMapFile);

  if (!allExists(albumArtFiles)) {
    return { success: false, errors: [{ type: ValidateMapError.MISSING_ALBUM_ART }] };
  }

  return {
    success: true,
    value: {
      title: validDifficultyResults[0].value.title,
      artist: validDifficultyResults[0].value.artist,
      author: validDifficultyResults[0].value.author,
      authoringTool: validDifficultyResults[0].value.authoringTool,
      description: validDifficultyResults[0].value.description,
      complexity: validDifficultyResults[0].value.complexity,
      difficulties: validDifficultyResults.map((d) => ({
        // Currently, custom difficulty values are not supported in the rlrr format. Persist them as
        // undefined for now, and look into generating a difficulty level later based on the map
        // content.
        difficulty: undefined,
        difficultyName: d.value.difficultyName,
      })),
      albumArtFiles,
    },
  };
}

function validateMapDifficulty(
  filename: string,
  rlrr: Uint8Array,
  getMapFile: (filename: string) => FileEntry | undefined
): Result<
  RawMapMetadata & { difficultyName: string; length: number | undefined },
  ValidateMapDifficultyError
> {
  let map: any;
  try {
    map = parseRlrr(rlrr);
  } catch {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }
  // Validate metadata fields
  const metadata = map.recordingMetadata;
  if (!metadata) {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }
  const requiredFields = {
    title: metadata.title,
    artist: metadata.artist,
    complexity: metadata.complexity,
  };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value == null) {
      return {
        success: false,
        errors: [
          {
            type: ValidateMapDifficultyError.MISSING_VALUES,
            userMessage: `${filename} is missing the "${key}" metadata property`,
          },
        ],
      };
    }
  }
  // The unofficial "ParEdit" editor writes its version to a top-level `editorData` object instead
  // of the official `authoringTool` property; derive `authoringTool` from it when not set directly.
  const editorData = map.editorData;
  let authoringTool = metadata.authoringTool;
  if (authoringTool == null && editorData?.editorVersion != null) {
    authoringTool = `ParEdit ${editorData.editorVersion}`;
  }
  const optionalFields = {
    description: metadata.description,
    author: metadata.creator,
    authoringTool,
    albumArt: metadata.coverImagePath,
  };
  const difficultyMatch = filename.match(/.*_(.+?).rlrr/);
  if (difficultyMatch == null) {
    return { success: false, errors: [{ type: ValidateMapDifficultyError.INVALID_FORMAT }] };
  }

  // Validate audio files
  // TODO: add automatic schema validation
  const songTracks = map.audioFileData?.songTracks;
  const drumTracks = map.audioFileData?.drumTracks;
  if (
    !Array.isArray(songTracks) ||
    !Array.isArray(drumTracks) ||
    !songTracks.every((s) => typeof s === 'string') ||
    !drumTracks.every((s) => typeof s === 'string')
  ) {
    return {
      success: false,
      errors: [
        {
          type: ValidateMapDifficultyError.INVALID_FORMAT,
          userMessage: 'AudioFileData tracks has invalid values',
        },
      ],
    };
  }
  const errors: ResultError<ValidateMapDifficultyError>['errors'] = [];
  for (const track of [...songTracks, ...drumTracks]) {
    if (getMapFile(track) == null) {
      errors.push({
        type: ValidateMapDifficultyError.NO_AUDIO,
        userMessage: `Missing audio track ${track} in ${filename}`,
      });
    }
  }
  if (errors.length !== 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    value: {
      ...requiredFields,
      ...optionalFields,
      difficultyName: difficultyMatch[1],
      length: rlrrSongLength(map),
    },
  };
}
