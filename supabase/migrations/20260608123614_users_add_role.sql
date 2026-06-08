alter table "public"."users" add column "role" text not null default 'user'::text;

alter table "public"."users" add constraint "users_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'owner'::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";


