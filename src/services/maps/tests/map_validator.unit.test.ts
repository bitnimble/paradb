import * as fs from 'fs';
import * as path from 'path';
import { validateMap } from 'services/maps/map_validator';

const readFixture = (name: string) => fs.readFileSync(path.resolve(__dirname, 'files', name));

const validate = (name: string) => validateMap({ id: 'test', buffer: readFixture(name) });

const expectError = async (name: string, type: string) => {
  const result = await validate(name);
  expect(result.success).toBe(false);
  expect((result as Extract<typeof result, { success: false }>).errors[0].type).toEqual(type);
};

describe('validateMap', () => {
  describe('accepts valid maps', () => {
    it('a standard valid map', async () => {
      const result = await validate('Test_valid.zip');
      expect(result.success).toBe(true);
      const value = (result as Extract<typeof result, { success: true }>).value;
      expect(value.title).toEqual('Test');
      expect(value.difficulties.length).toBeGreaterThan(0);
    });

    it('a second valid map', async () => {
      const result = await validate('Test_valid2.zip');
      expect(result.success).toBe(true);
    });

    it('a valid map whose folder name matches the rlrr files', async () => {
      const result = await validate('Test_valid_different_folder_name.zip');
      expect(result.success).toBe(true);
    });
  });

  describe('rejects invalid maps', () => {
    it('a corrupted or unsupported archive', async () => {
      await expectError('Test_invalid_archive.zip', 'no_data');
    });

    it('files not contained in a single top-level folder', async () => {
      await expectError('Test_missing_folder.zip', 'incorrect_folder_structure');
    });

    it('a folder name that does not match the rlrr files', async () => {
      await expectError('Test_incorrect_folder_name.zip', 'incorrect_folder_name');
    });

    it('no rlrr files', async () => {
      await expectError('Test_missing_rlrr.zip', 'no_data');
    });

    it('a corrupted or incorrectly formatted rlrr file', async () => {
      await expectError('Test_invalid_rlrr.zip', 'invalid_format');
    });

    it('a missing required metadata field', async () => {
      await expectError('Test_missing_title.zip', 'missing_values');
    });

    it('a missing drum audio track', async () => {
      await expectError('Test_missing_audio_drums.zip', 'no_audio');
    });

    it('a missing song audio track', async () => {
      await expectError('Test_missing_audio_song.zip', 'no_audio');
    });

    it('mismatched metadata between difficulties', async () => {
      await expectError('Test_different_metadata.zip', 'mismatched_difficulty_metadata');
    });

    it('a missing album art file', async () => {
      await expectError('Test_missing_album_art.zip', 'missing_album_art');
    });
  });
});
