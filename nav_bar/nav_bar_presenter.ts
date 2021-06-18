import { observable, runInAction } from 'mobx';
import { Api, User } from 'pages/paradb/base/api/api';

export class NavBarStore {
  @observable.ref
  user: User | undefined;
}

export class NavBarPresenter {
  constructor(private readonly api: Api, private readonly store: NavBarStore) { }

  async getUserInfo() {
    try {
      const user = await this.api.getMe();
      runInAction(() => this.store.user = user);
    } catch (e) {
      // Unauthorized, so don't do anything
    }
  }
}
