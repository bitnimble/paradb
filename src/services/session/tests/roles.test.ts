import { _unwrap } from 'base/result';
import { testUser } from 'services/jest_helpers';
import { getServerContext } from 'services/server_context';
import { getUserRole, verifyOwner } from 'services/session/session';
import { _setCurrentUserForTesting } from 'services/session/supabase_fake';
import { UserRole, createUser, getUser } from 'services/users/users_repo';
import * as db from 'zapatos/db';

const signUpTestUser = () =>
  _unwrap(
    createUser({
      email: testUser.email,
      username: testUser.username,
      password: testUser.password,
    })
  );

const promoteToOwner = async (id: string) => {
  const { pool } = await getServerContext();
  await db.update('users', { role: UserRole.OWNER }, { id }).run(pool);
};

describe('user roles', () => {
  it('defaults new users to the user role', async () => {
    await signUpTestUser();
    const user = await _unwrap(getUser({ by: 'username', username: testUser.username }));
    expect(user.role).toEqual(UserRole.USER);
  });

  it('getUserRole reflects the stored role', async () => {
    const created = await signUpTestUser();
    _setCurrentUserForTesting({
      id: created.id,
      email: testUser.email,
      username: testUser.username,
    });

    expect(await getUserRole()).toEqual(UserRole.USER);

    await promoteToOwner(created.id);
    expect(await getUserRole()).toEqual(UserRole.OWNER);
  });

  it('verifyOwner allows owners and redirects everyone else', async () => {
    const created = await signUpTestUser();
    _setCurrentUserForTesting({
      id: created.id,
      email: testUser.email,
      username: testUser.username,
    });

    // A normal user is redirected away, which surfaces as a thrown Next redirect.
    await expect(verifyOwner()).rejects.toThrow();

    await promoteToOwner(created.id);
    const session = await verifyOwner();
    expect(session.id).toEqual(created.id);
  });
});
