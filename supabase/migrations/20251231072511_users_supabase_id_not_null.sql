alter table "public"."users" drop constraint "users_email_key";

drop index if exists "public"."idx_users_email";

drop index if exists "public"."users_email_key";

alter table "public"."users" drop column "account_status";

alter table "public"."users" drop column "creation_date";

alter table "public"."users" drop column "email";

alter table "public"."users" drop column "password";

alter table "public"."users" drop column "password_updated";

alter table "public"."users" alter column "supabase_id" set not null;


