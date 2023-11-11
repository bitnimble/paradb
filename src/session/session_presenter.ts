import { makeAutoObservable, runInAction } from 'mobx';
import { Api } from 'app/api/api';
import { User } from 'schema/users';

export class SessionStore {
  hasLoaded = false;
  user?: User = undefined;

  constructor() {
    makeAutoObservable(this);
  }
}

export class SessionPresenter {
  constructor(
    private readonly api: Api,
    private readonly store: SessionStore
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async maybeLoadSession() {
    if (this.store.hasLoaded) {
      return;
    }

    try {
      const user = await this.api.getSession();
      runInAction(() => (this.store.user = user));
    } catch (e) {
      // Unauthorized, so don't do anything
    } finally {
      runInAction(() => (this.store.hasLoaded = true));
    }
  }
}

export function useUser() {
  return;
}
