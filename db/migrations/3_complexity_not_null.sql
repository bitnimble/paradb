/* To be run after all maps have a populated complexity value, and after all difficulties
 * have a populated difficulty_ame value (taken from the .rlrr file in the stored zip).
 */

ALTER TABLE maps
ALTER COLUMN complexity SET NOT NULL;

ALTER TABLE difficulties
ALTER COLUMN difficulty_name SET NOT NULL;
