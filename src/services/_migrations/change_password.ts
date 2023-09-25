import { setupMigration } from './migration';
import { changePassword, getUser } from 'services/users/users_repo';

(async () => {
  await setupMigration();

  const userResp = await getUser({ by: 'email', email: '' });
  if (!userResp.success) {
    console.error('could not find user');
    return;
  }
  await changePassword({ user: userResp.value, newPassword: '' });
  console.log('Changed');
})();
