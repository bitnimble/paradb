-- Existing rows are naive timestamps that represent UTC instants, so interpret them as UTC
-- explicitly rather than relying on the migration session's timezone.
alter table "public"."maps" alter column "submission_date" set data type timestamp with time zone using "submission_date" at time zone 'UTC';


