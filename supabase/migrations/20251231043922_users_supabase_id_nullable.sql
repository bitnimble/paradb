alter table "public"."users" add column "supabase_id" uuid;

CREATE INDEX idx_users_supabase_id ON public.users USING btree (supabase_id);

CREATE UNIQUE INDEX users_supabase_id_key ON public.users USING btree (supabase_id);

alter table "public"."users" add constraint "users_supabase_id_key" UNIQUE using index "users_supabase_id_key";


