import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

import { redirect } from 'next/navigation';
import { getServerContext } from 'services/server_context';
import { markUserVerified } from 'services/users/users_repo';
import { RoutePath, routeFor } from 'utils/routes';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? routeFor([RoutePath.MAP_LIST]);

  if (token_hash && type) {
    const { supabase } = await getServerContext();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      if (data.user) {
        try {
          await markUserVerified(data.user.user_metadata.id);
        } catch (e) {
          redirect('/signup/confirm/auth-code-error');
        }
      }

      // redirect user to specified redirect URL or root of app
      redirect(next);
    }
  }

  // redirect the user to an error page with some instructions
  redirect('/signup/confirm/auth-code-error');
}
