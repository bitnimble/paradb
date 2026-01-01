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
