import { PromisedResult, Result, ResultError } from 'base/result';
import { PDMap } from 'schema/maps';
// @ts-ignore
import * as encoding from 'encoding';
import path from 'path';
import * as unzipper from 'unzipper';

type RawMap = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'description' | 'complexity' | 'difficulties'
>;

export const enum ValidateMapError {
  MISMATCHED_DIFFICULTY_METADATA = 'mismatched_difficulty_metadata',
  INCORRECT_FOLDER_STRUCTURE = 'incorrect_folder_structure',
  INCORRECT_FOLDER_NAME = 'incorrect_folder_name',
  NO_DATA = 'no_data',
  MISSING_ALBUM_ART = 'missing_album_art',
}
export const enum ValidateMapDifficultyError {
  INVALID_FORMAT = 'invalid_format',
  MISSING_VALUES = 'missing_values',
  NO_AUDIO = 'no_audio',
}

export async function validateMap(opts: {
  id: string;
  buffer: Buffer;
}): PromisedResult<
  RawMap & { albumArtFiles: unzipper.File[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  let map: unzipper.CentralDirectory;
  try {
    map = await unzipper.Open.buffer(opts.buffer);
  } catch (e) {
    // Failed to open zip -- corrupted, or incorrect format
    return { success: false, errors: [{ type: ValidateMapError.NO_DATA }] };
  }
  // A submitted map must have exactly one directory in it, and all of the files must be directly
  // under that directory.
  const files = map.files.filter((f) => f.type === 'File');
  let mapName = files[0].path.match(/(.+?)\//)?.[1];
  if (mapName?.startsWith('/')) {
    mapName = mapName.substring(1);
  }
  if (mapName == null || !files.every((f) => path.dirname(f.path) === mapName)) {
    return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_STRUCTURE }] };
  }
  const validatedResult = validateMapFiles({ expectedMapName: mapName, mapFiles: files });
  return validatedResult;
}

function allExists<T>(a: (T | undefined)[]): a is T[] {
  return a.every((t) => t != null);
}
type RawMapMetadata = Pick<
  PDMap,
  'title' | 'artist' | 'author' | 'albumArt' | 'description' | 'complexity'
>;
async function validateMapFiles(opts: {
  expectedMapName: string;
  mapFiles: unzipper.File[];
}): PromisedResult<
  RawMap & { albumArtFiles: unzipper.File[] },
  ValidateMapError | ValidateMapDifficultyError
> {
  // The map directory needs to have the same name as the rlrr files.
  // TODO: remove this check once Paradiddle supports arbitrary folder names
  const difficultyFiles = opts.mapFiles.filter((f) => f.path.endsWith('.rlrr'));
  if (!difficultyFiles.every((f) => path.basename(f.path).startsWith(opts.expectedMapName))) {
    return { success: false, errors: [{ type: ValidateMapError.INCORRECT_FOLDER_NAME }] };
  }
  // Gets a file in the map archive, relative to the primary map directory
  const getMapFile = (filename: string) =>
    opts.mapFiles.find((f) => f.path === `${opts.expectedMapName}${path.sep}${filename}`);

  const difficultyResults = await Promise.all(
    difficultyFiles.map((f) =>
      f.buffer().then((b) => validateMapDifficulty(path.basename(f.path), b, getMapFile))
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
      if (key === 'difficultyName' || key === 'complexity') {
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
  mapBuffer: Buffer,
  getMapFile: (filename: string) => unzipper.File | undefined
): Result<RawMapMetadata & { difficultyName: string }, ValidateMapDifficultyError> {
  let map: any;
  try {
    map = parseJsonBuffer(mapBuffer);
  } catch (e) {
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
  const optionalFields = {
    description: metadata.description,
    author: metadata.creator,
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
    value: { ...requiredFields, ...optionalFields, difficultyName: difficultyMatch[1] },
  };
}

function parseJsonBuffer(buffer: Buffer) {
  if (buffer.indexOf('\uFEFF', 0, 'utf16le') === 0) {
    return JSON.parse(encoding.convert(buffer, 'utf8', 'utf16le'));
  }
  return JSON.parse(buffer.toString());
}
