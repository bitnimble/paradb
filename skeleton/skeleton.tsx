import { observer } from 'mobx-react';
import { NotFound } from 'pages/paradb/router/not_found';
import { routeFor, RoutePath } from 'pages/paradb/router/routes';
import { deserializeMap, PDMap } from 'paradb-api-schema';
import React from 'react';
import { BrowserRouter, Route, Router, Routes, useLocation, useParams } from 'react-router-dom';
import styles from './skeleton.css';

export type SkeletonProps = {
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
  private MapPageWrapper = () => {
    const params = useParams();
    if (params.id == null) {
      return null;
    }
    const location = useLocation();
    const { MapPage } = this.props;
    return (
      <MapPage
          id={params.id}
          map={location.state != null && location.state instanceof Uint8Array
            ? deserializeMap(location.state)
            : undefined
          }
      />
    );
  };

  render() {
    const {
      NavBar,
      MapList,
      LoginSignupPage,
      SettingsPage,
      SubmitMapPage,
      InstructionsPage,
    } = this.props;
    return (
      <BrowserRouter>
        <div className={styles.skeleton}>
          <NavBar/>
          <div className={styles.content}>
            <Routes>
              <Route path={routeFor([RoutePath.MAP_LIST])} element={<MapList/>}/>
              <Route path={routeFor([RoutePath.MAP, RoutePath.SUBMIT])} element={<SubmitMapPage/>}/>
              <Route path={routeFor([RoutePath.MAP, ':id'])} element={<this.MapPageWrapper/>}/>
              <Route path={routeFor([RoutePath.LOGIN])} element={<LoginSignupPage mode="login"/>}/>
              <Route path={routeFor([RoutePath.SETTINGS])} element={<SettingsPage/>}/>
              <Route path={routeFor([RoutePath.SIGNUP])} element={<LoginSignupPage mode="signup"/>}/>
              <Route path={routeFor([RoutePath.INSTRUCTIONS])} element={<InstructionsPage/>}/>
              <Route path="*" element={<NotFound/>}/>
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    );
  }
}
