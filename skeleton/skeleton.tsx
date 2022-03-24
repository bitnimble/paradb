import { History } from 'history';
import { observer } from 'mobx-react';
import { NotFound } from 'pages/paradb/router/not_found';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { deserializeMap, PDMap } from 'paradb-api-schema';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import styles from './skeleton.css';

export type SkeletonProps = {
  history: History,
  NavBar: React.ComponentType,
  MapPage: React.ComponentType<{ id: string, map: PDMap | undefined }>,
  MapList: React.ComponentType,
  LoginSignupPage: React.ComponentType<{ mode: 'signup' | 'login' }>,
  SettingsPage: React.ComponentType,
  SubmitMapPage: React.ComponentType,
  InstructionsPage: React.ComponentType,
};

@observer
export class Skeleton extends React.Component<SkeletonProps> {
  render() {
    const { history, NavBar, MapPage, MapList, LoginSignupPage, SettingsPage, SubmitMapPage, InstructionsPage } = this.props;

    return (
        <Router history={history}>
          <div className={styles.skeleton}>
            <NavBar/>
            <div className={styles.content}>
              <Switch>
                <Route path={routeFor([RoutePath.MAP_LIST])} exact={true}>
                  <MapList/>
                </Route>
                <Route path={routeFor([RoutePath.MAP, RoutePath.SUBMIT])}>
                  <SubmitMapPage/>
                </Route>
                <Route path={routeFor([RoutePath.MAP, ':id'])}>
                  {({ match, location }) => (
                      match && match.params.id != null
                      && <MapPage
                          id={match.params.id}
                          map={location.state != null && location.state instanceof Uint8Array
                              ? deserializeMap(location.state)
                              : undefined}
                      />
                  )}
                </Route>
                <Route path={routeFor([RoutePath.LOGIN])}>
                  <LoginSignupPage mode="login"/>
                </Route>
                <Route path={routeFor([RoutePath.SETTINGS])}>
                  <SettingsPage/>
                </Route>
                <Route path={routeFor([RoutePath.SIGNUP])}>
                  <LoginSignupPage mode="signup"/>
                </Route>
                <Route path={routeFor([RoutePath.INSTRUCTIONS])}>
                  <InstructionsPage/>
                </Route>
                <Route>
                  <NotFound/>
                </Route>
              </Switch>
            </div>
          </div>
        </Router>
    );
  }
}
