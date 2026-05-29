import { _unwrap } from 'base/result';
import { testUser } from 'services/jest_helpers';
import { getServerContext } from 'services/server_context';
import { _setCurrentUserForTesting } from 'services/session/supabase_fake';
import { changePassword, createUser, getUser } from 'services/users/users_repo';
import * as db from 'zapatos/db';

describe('user repository', () => {
  it('can create a user', async () => {
    const { pool } = await getServerContext();
    expect((await db.select('users', {}).run(pool)).length).toEqual(0);

    const createdUser = await _unwrap(
      createUser({
        email: testUser.email,
        username: testUser.username,
        password: testUser.password,
      })
    );
    const actualUsers = await db.select('users', {}).run(pool);

    expect(actualUsers.length).toEqual(1);
    const user = actualUsers[0];

    // The users table stores username + supabase_id; the email lives in Supabase, not this table.
    expect(user).toEqual(expect.objectContaining({ username: testUser.username }));
    expect(createdUser).toEqual(expect.objectContaining({ success: true }));
    expect(/U[A-Z0-9]{6}/.test(createdUser.id)).toEqual(true);
    expect(/U[A-Z0-9]{6}/.test(user.id)).toEqual(true);
    expect(createdUser.id).toEqual(user.id);
  });

  it('can get a user', async () => {
    await createUser({
      email: testUser.email,
      username: testUser.username,
      password: testUser.password,
    });

    const user = await _unwrap(getUser({ by: 'username', username: testUser.username }));
    expect(user).toEqual(expect.objectContaining({ username: testUser.username }));
  });

  it('can change a password', async () => {
    await createUser({
      email: testUser.email,
      username: testUser.username,
      password: testUser.password,
    });
    const originalUser = await _unwrap(getUser({ by: 'username', username: testUser.username }));

    // changePassword reads the current session's email via `supabase.auth.getUser`. There's no
    // request scope here, so install the test user explicitly.
    _setCurrentUserForTesting({ email: testUser.email });
    const result = await changePassword({
      user: originalUser,
      newPassword: 'ThisIsANewPassword457',
    });
    expect(result.success).toEqual(true);

    // TODO: check that the old password no longer works. Figure out how to set up a Supabase
    // user session in a unit test.
  });
});
