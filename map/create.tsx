import { runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Api } from 'pages/paradb/base/api/api';
import { useComponentDidMount } from 'pages/paradb/base/helpers';
import { MapPage } from 'pages/paradb/map/map_page';
import { MapPagePresenter, MapPageStore } from 'pages/paradb/map/map_presenter';
import { SubmitMapPage } from 'pages/paradb/map/submit_map';
import {
  SubmitMapPresenter,
  SubmitMapStore,
  ThrottledMapUploader,
} from 'pages/paradb/map/submit_map_presenter';
import { Navigate } from 'pages/paradb/router/install';
import { SessionStore } from 'pages/paradb/session/session_presenter';
import { PDMap } from 'paradb-api-schema';
import React from 'react';

export function createMapPage(api: Api, navigate: Navigate, sessionStore: SessionStore) {
  const store = new MapPageStore();
  const presenter = new MapPagePresenter(api, navigate, store);

  return observer(({ id, map }: { id: string, map: PDMap | undefined }) => {
    useComponentDidMount(() => {
      if (map) {
        runInAction(() => store.map = map);
        window.history.replaceState({}, '');
      } else {
        store.map = undefined;
        presenter.getMap(id);
      }
    });

    const deleteMap = () => presenter.deleteMap(id);
    const toggleFavorite = () => presenter.toggleFavorite(id);

    return (
      <MapPage
        map={store.map}
        canDelete={!!(store.map && sessionStore.user && store.map.uploader === sessionStore.user.id)}
        isFavorited={store
          .map
          ?.userProjection
          ?.isFavorited}
        deleteMap={deleteMap}
        toggleFavorite={toggleFavorite}
      />
    );
  });
}

export function createSubmitMapPage(api: Api, navigate: Navigate) {
  const store: SubmitMapStore = new SubmitMapStore();
  const uploader = new ThrottledMapUploader(api);
  const presenter = new SubmitMapPresenter(uploader, navigate, store);

  return observer(() => {
    useComponentDidMount(() => {
      // Reset the store state whenever we visit the page
      store.reset();
      uploader.reset();
    });

    return (
      <SubmitMapPage
        filenames={store.filenames}
        uploadProgress={uploader.uploadProgress}
        isUploading={uploader.isUploading}
        showProgressScreen={uploader.isUploading || uploader.hasErrors}
        onChangeData={presenter.onChangeData}
        onSubmit={presenter.submit}
      />
    );
  });
}
