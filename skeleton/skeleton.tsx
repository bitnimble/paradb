import { History } from 'history';
import { observer } from 'mobx-react';
import { NotFound } from 'pages/paradb/router/not_found';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import styles from './skeleton.css';

export type SkeletonProps = {
  history: History,
  NavBar: React.ComponentType,
  MapPage: React.ComponentType<{ id: string }>,
  MapList: React.ComponentType,
}

@observer
export class Skeleton extends React.Component<SkeletonProps> {
  render() {
    const { history, NavBar, MapPage, MapList } = this.props;

    return (
      <Router history={history}>
        <div className={styles.skeleton}>
          <NavBar/>
          <div className={styles.content}>
            <Switch>
              <Route path={routeFor([RoutePath.MAP_LIST])} exact={true}>
                <MapList/>
              </Route>
              <Route path={routeFor([RoutePath.MAP, ':id'])}>
                {({ match }) => (
                  match && match.params.id != null && <MapPage id={match.params.id}/>
                )}
              </Route>
              <Route>
                <NotFound/>
              </Route>
            </Switch>
          </div>
        </div>
      </Router>
    )
  }
}
