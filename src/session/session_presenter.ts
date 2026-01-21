import { Api } from 'app/api/api';
import { observable, runInAction } from 'mobx';
import { User } from 'schema/users';
import { createClient } from 'services/session/supabase_client';

export class SessionStore {
  @observable accessor hasLoaded = false;
  @observable accessor user: User | undefined = undefined;
}

export class SessionPresenter {
  constructor(
    private readonly api: Api,
    private readonly store: SessionStore
  ) {}

  async maybeLoadSession() {
    // TODO: rewrite sessionstore and presenter in the client to just use Supabase Auth
    const client = createClient();
    await client.auth.initialize();

    if (this.store.hasLoaded) {
      return;
    }

    try {
      const user = await this.api.getSession();
      runInAction(() => (this.store.user = user));
    } catch {
      // Unauthorized, so don't do anything
    } finally {
      runInAction(() => (this.store.hasLoaded = true));
    }
  }
}

export function useUser() {
  return;
}
