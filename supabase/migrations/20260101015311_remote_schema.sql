create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

alter table "public"."difficulties" enable row level security;

alter table "public"."favorites" enable row level security;

alter table "public"."maps" enable row level security;

alter table "public"."users" enable row level security;

CREATE INDEX difficulties_map_id_idx ON public.difficulties USING btree (map_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_email_exists(input_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT id
    FROM auth.users
    WHERE email = input_email
);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_user_password(password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_id uuid;
BEGIN
  user_id := auth.uid();
  RETURN EXISTS (
    SELECT id
    FROM auth.users
    WHERE id = user_id AND encrypted_password = crypt(password::text, auth.users.encrypted_password)
  );
END;
$function$
;
