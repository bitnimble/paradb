alter table "public"."maps" add column "fts" tsvector generated always as ((((setweight(to_tsvector('english'::regconfig, (title)::text), 'A'::"char") || setweight(to_tsvector('english'::regconfig, (artist)::text), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, (COALESCE(author, ''::character varying))::text), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'D'::"char"))) stored;

CREATE INDEX maps_fts_idx ON public.maps USING gin (fts);


