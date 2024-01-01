ALTER TABLE maps ADD COLUMN map_status char;
UPDATE maps SET map_status = 0;
ALTER TABLE maps ALTER COLUMN map_status SET NOT NULL;
