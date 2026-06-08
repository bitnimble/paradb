alter table "public"."users" add column "role" character varying(16) not null default 'user'::character varying;

alter table "public"."users" add constraint "users_role_check" CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'owner'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "users_role_check";


