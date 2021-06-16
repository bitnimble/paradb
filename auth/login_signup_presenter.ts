import { IObservableValue } from 'mobx';
import { Api } from 'pages/paradb/base/api/api';
import { Navigate } from 'pages/paradb/router/install';
import { RoutePath } from 'pages/paradb/router/routes';

export class LoginSignupPresenter {
  constructor(
      private readonly api: Api,
      private readonly navigate: Navigate,
      private readonly username: IObservableValue<string>,
      private readonly password: IObservableValue<string>,
  ) { }

  login = async () => {
    const username = this.username.get();
    const password = this.password.get();

    const resp = await this.api.login({ username, password });
    if (resp.success) {
      this.navigate([RoutePath.MAP_LIST]);
    }
  };

  signup = () => {

  };
}
