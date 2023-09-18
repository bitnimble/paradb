ALTER TABLE complexities
ALTER COLUMN complexity DROP NOT NULL;

ALTER TABLE complexities
RENAME COLUMN complexity TO difficulty;

ALTER TABLE complexities
RENAME COLUMN complexity_name TO difficulty_name;

ALTER TABLE complexities
RENAME CONSTRAINT "complexities_map_id_fkey" TO "difficulties_map_id_fkey";

ALTER TABLE complexities
RENAME TO difficulties;

ALTER TABLE maps
ADD COLUMN complexity int;
