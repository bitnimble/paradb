-- The old `tags text` column stored newline-delimited values, so split on newlines rather than
-- casting (`text::text[]` would fail on any non-array-literal value); NULL stays NULL.
alter table "public"."maps" alter column "tags" set data type text[] using case when "tags" is null then null else string_to_array("tags", E'\n') end;

CREATE INDEX maps_tags_idx ON public.maps USING gin (tags);


