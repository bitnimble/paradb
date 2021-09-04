import { makeAutoObservable, runInAction } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { User } from 'paradb-api-schema';

export class SessionStore {
  hasLoaded = false;
  user?: User;

  constructor() {
    makeAutoObservable(this);
  }
}

export class SessionPresenter {
  constructor(private readonly api: Api, private readonly store: SessionStore) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async maybeLoadSession() {
    if (this.store.hasLoaded) {
      return;
    }

    try {
      const user = await this.api.getMe();
      runInAction(() => this.store.user = user);
    } catch (e) {
      // Unauthorized, so don't do anything
    } finally {
      runInAction(() => this.store.hasLoaded = true);
    }
  }
}
